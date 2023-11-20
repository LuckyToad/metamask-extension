import EventEmitter from 'events';

import { SINGLE_CALL_BALANCES_ADDRESSES } from '../constants/contracts';

import { createTestProviderTools } from '../../../test/stub/provider';
import AccountTracker from './account-tracker';

const noop = () => true;
const currentNetworkId = '5';
const currentChainId = '0x5';
const VALID_ADDRESS = '0x0000000000000000000000000000000000000000';
const VALID_ADDRESS_TWO = '0x0000000000000000000000000000000000000001';

const SELECTED_ADDRESS = '0x123';

const INITIAL_BALANCE_1 = '0x1';
const INITIAL_BALANCE_2 = '0x2';
const UPDATE_BALANCE = '0xabc';
const UPDATE_BALANCE_HOOK = '0xabcd';

const GAS_LIMIT = '0x111111';
const GAS_LIMIT_HOOK = '0x222222';

// The below three values were generated by running MetaMask in the browser
// The response to eth_call, which is called via `ethContract.balances`
// in `_updateAccountsViaBalanceChecker` of account-tracker.js, needs to be properly
// formatted or else ethers will throw an error.
const ETHERS_CONTRACT_BALANCES_ETH_CALL_RETURN =
  '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000038d7ea4c6800600000000000000000000000000000000000000000000000000000000000186a0';
const EXPECTED_CONTRACT_BALANCE_1 = '0x038d7ea4c68006';
const EXPECTED_CONTRACT_BALANCE_2 = '0x0186a0';

const mockAccounts = {
  [VALID_ADDRESS]: { address: VALID_ADDRESS, balance: INITIAL_BALANCE_1 },
  [VALID_ADDRESS_TWO]: {
    address: VALID_ADDRESS_TWO,
    balance: INITIAL_BALANCE_2,
  },
};

describe('Account Tracker', () => {
  let provider,
    blockTrackerStub,
    providerFromHook,
    blockTrackerFromHookStub,
    completedOnboarding,
    useMultiAccountBalanceChecker,
    accountTracker,
    accountRemovedListener,
    getNetworkIdentifierStub,
    getNetworkClientByIdStub;

  beforeEach(() => {
    provider = createTestProviderTools({
      scaffold: {
        eth_getBalance: UPDATE_BALANCE,
        eth_call: ETHERS_CONTRACT_BALANCES_ETH_CALL_RETURN,
        eth_getBlockByNumber: { gasLimit: GAS_LIMIT },
      },
      networkId: currentNetworkId,
      chainId: currentNetworkId,
    }).provider;

    blockTrackerStub = new EventEmitter();
    blockTrackerStub.getCurrentBlock = noop;
    blockTrackerStub.getLatestBlock = noop;

    providerFromHook = createTestProviderTools({
      scaffold: {
        eth_getBalance: UPDATE_BALANCE_HOOK,
        eth_call: ETHERS_CONTRACT_BALANCES_ETH_CALL_RETURN,
        eth_getBlockByNumber: { gasLimit: GAS_LIMIT_HOOK },
      },
      networkId: '0x1',
      chainId: '0x1',
    }).provider;

    blockTrackerFromHookStub = new EventEmitter();
    blockTrackerFromHookStub.getCurrentBlock = noop;
    blockTrackerFromHookStub.getLatestBlock = noop;

    getNetworkClientByIdStub = jest.fn().mockReturnValue({
      configuration: {
        chainId: '0x1',
      },
      blockTracker: blockTrackerFromHookStub,
      provider: providerFromHook,
    });

    getNetworkIdentifierStub = jest.fn();

    accountTracker = new AccountTracker({
      provider,
      blockTracker: blockTrackerStub,
      getNetworkClientById: getNetworkClientByIdStub,
      getNetworkIdentifier: getNetworkIdentifierStub,
      preferencesController: {
        store: {
          getState: () => ({
            useMultiAccountBalanceChecker,
          }),
          subscribe: noop,
        },
        getSelectedAddress: () => SELECTED_ADDRESS,
      },
      onboardingController: {
        store: {
          subscribe: noop,
          getState: () => ({
            completedOnboarding,
          }),
        },
      },
      onAccountRemoved: (callback) => {
        accountRemovedListener = callback;
      },
      getCurrentChainId: () => currentChainId,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('start', () => {
    it('restarts the subscription to the block tracker and update accounts', async () => {
      jest.spyOn(blockTrackerStub, 'addListener').mockImplementation();
      jest.spyOn(blockTrackerStub, 'removeListener').mockImplementation();
      const updateAccountsWithNetworkClientIdSpy = jest
        .spyOn(accountTracker, '_updateAccounts')
        .mockResolvedValue();

      accountTracker.start();

      expect(blockTrackerStub.removeListener).toHaveBeenNthCalledWith(
        1,
        'latest',
        accountTracker._updateForBlock,
      );
      expect(blockTrackerStub.addListener).toHaveBeenNthCalledWith(
        1,
        'latest',
        accountTracker._updateForBlock,
      );
      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenNthCalledWith(1); // called first time with no args

      accountTracker.start();

      expect(blockTrackerStub.removeListener).toHaveBeenNthCalledWith(
        2,
        'latest',
        accountTracker._updateForBlock,
      );
      expect(blockTrackerStub.addListener).toHaveBeenNthCalledWith(
        2,
        'latest',
        accountTracker._updateForBlock,
      );
      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenNthCalledWith(2); // called second time with no args

      accountTracker.stop();
    });
  });

  describe('stop', () => {
    it('ends the subscription to the block tracker', async () => {
      jest.spyOn(blockTrackerStub, 'removeListener').mockImplementation();

      accountTracker.stop();

      expect(blockTrackerStub.removeListener).toHaveBeenNthCalledWith(
        1,
        'latest',
        accountTracker._updateForBlock,
      );
    });
  });

  describe('startPollingByNetworkClientId', () => {
    it('should subscribe to the block tracker and update accounts if not already using the networkClientId', async () => {
      jest.spyOn(blockTrackerFromHookStub, 'addListener').mockImplementation();
      const updateAccountsWithNetworkClientIdSpy = jest
        .spyOn(accountTracker, '_updateAccounts')
        .mockResolvedValue();

      accountTracker.startPollingByNetworkClientId('mainnet');

      expect(blockTrackerFromHookStub.addListener).toHaveBeenCalledWith(
        'latest',
        expect.any(Function),
      );
      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenCalledWith(
        'mainnet',
      );

      accountTracker.startPollingByNetworkClientId('mainnet');

      expect(blockTrackerFromHookStub.addListener).toHaveBeenCalledTimes(1);
      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenCalledTimes(1);

      accountTracker.stopAllPolling();
    });

    it('should subscribe to the block tracker and update accounts for each networkClientId', async () => {
      const blockTrackerFromHookStub1 = new EventEmitter();
      blockTrackerFromHookStub1.getCurrentBlock = noop;
      blockTrackerFromHookStub1.getLatestBlock = noop;
      jest.spyOn(blockTrackerFromHookStub1, 'addListener').mockImplementation();

      const blockTrackerFromHookStub2 = new EventEmitter();
      blockTrackerFromHookStub2.getCurrentBlock = noop;
      blockTrackerFromHookStub2.getLatestBlock = noop;
      jest.spyOn(blockTrackerFromHookStub2, 'addListener').mockImplementation();

      const blockTrackerFromHookStub3 = new EventEmitter();
      blockTrackerFromHookStub3.getCurrentBlock = noop;
      blockTrackerFromHookStub3.getLatestBlock = noop;
      jest.spyOn(blockTrackerFromHookStub3, 'addListener').mockImplementation();

      getNetworkClientByIdStub = jest
        .fn()
        .mockImplementation((networkClientId) => {
          switch (networkClientId) {
            case 'mainnet':
              return {
                configuration: {
                  chainId: '0x1',
                },
                blockTracker: blockTrackerFromHookStub1,
              };
            case 'goerli':
              return {
                configuration: {
                  chainId: '0x5',
                },
                blockTracker: blockTrackerFromHookStub2,
              };
            case 'networkClientId1':
              return {
                configuration: {
                  chainId: '0xa',
                },
                blockTracker: blockTrackerFromHookStub3,
              };
            default:
              throw new Error('unexpected networkClientId');
          }
        });

      accountTracker = new AccountTracker({
        provider,
        blockTracker: blockTrackerStub,
        getNetworkClientById: getNetworkClientByIdStub,
        getNetworkIdentifier: jest.fn(),
        preferencesController: {
          store: {
            getState: () => ({
              useMultiAccountBalanceChecker,
            }),
            subscribe: noop,
          },
        },
        onboardingController: {
          store: {
            subscribe: noop,
            getState: noop,
          },
        },
        onAccountRemoved: (callback) => {
          accountRemovedListener = callback;
        },
        getCurrentChainId: () => currentChainId,
      });

      const updateAccountsWithNetworkClientIdSpy = jest
        .spyOn(accountTracker, '_updateAccounts')
        .mockResolvedValue();

      accountTracker.startPollingByNetworkClientId('mainnet');

      expect(blockTrackerFromHookStub1.addListener).toHaveBeenCalledWith(
        'latest',
        expect.any(Function),
      );
      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenCalledWith(
        'mainnet',
      );

      accountTracker.startPollingByNetworkClientId('goerli');

      expect(blockTrackerFromHookStub2.addListener).toHaveBeenCalledWith(
        'latest',
        expect.any(Function),
      );
      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenCalledWith(
        'goerli',
      );

      accountTracker.startPollingByNetworkClientId('networkClientId1');

      expect(blockTrackerFromHookStub3.addListener).toHaveBeenCalledWith(
        'latest',
        expect.any(Function),
      );
      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenCalledWith(
        'networkClientId1',
      );

      accountTracker.stopAllPolling();
    });
  });

  describe('stopPollingByPollingToken', () => {
    it('should unsubscribe from the block tracker when called with a valid polling that was the only active pollingToken for a given networkClient', async () => {
      jest
        .spyOn(blockTrackerFromHookStub, 'removeListener')
        .mockImplementation();
      jest.spyOn(accountTracker, '_updateAccounts').mockResolvedValue();

      const pollingToken =
        accountTracker.startPollingByNetworkClientId('mainnet');

      accountTracker.stopPollingByPollingToken(pollingToken);

      expect(blockTrackerFromHookStub.removeListener).toHaveBeenCalledWith(
        'latest',
        expect.any(Function),
      );
    });

    it('should not unsubscribe from the block tracker if called with one of multiple active polling tokens for a given networkClient', async () => {
      jest
        .spyOn(blockTrackerFromHookStub, 'removeListener')
        .mockImplementation();
      jest.spyOn(accountTracker, '_updateAccounts').mockResolvedValue();

      const pollingToken1 =
        accountTracker.startPollingByNetworkClientId('mainnet');
      accountTracker.startPollingByNetworkClientId('mainnet');

      accountTracker.stopPollingByPollingToken(pollingToken1);

      expect(blockTrackerFromHookStub.removeListener).not.toHaveBeenCalled();

      accountTracker.stopAllPolling();
    });
    it('should error if no pollingToken is passed', () => {
      expect(() => {
        accountTracker.stopPollingByPollingToken(undefined);
      }).toThrow('pollingToken required');
    });

    it('should error if no matching pollingToken is found', () => {
      expect(() => {
        accountTracker.stopPollingByPollingToken('potato');
      }).toThrow('pollingToken not found');
    });
  });

  describe('stopAll', () => {
    it('should end all subscriptions', async () => {
      jest.spyOn(blockTrackerStub, 'removeListener').mockImplementation();

      const blockTrackerFromHookStub1 = new EventEmitter();
      blockTrackerFromHookStub1.getCurrentBlock = noop;
      blockTrackerFromHookStub1.getLatestBlock = noop;
      jest
        .spyOn(blockTrackerFromHookStub1, 'removeListener')
        .mockImplementation();

      const blockTrackerFromHookStub2 = new EventEmitter();
      blockTrackerFromHookStub2.getCurrentBlock = noop;
      blockTrackerFromHookStub2.getLatestBlock = noop;
      jest
        .spyOn(blockTrackerFromHookStub2, 'removeListener')
        .mockImplementation();

      getNetworkClientByIdStub = jest
        .fn()
        .mockImplementation((networkClientId) => {
          switch (networkClientId) {
            case 'mainnet':
              return {
                configuration: {
                  chainId: '0x1',
                },
                blockTracker: blockTrackerFromHookStub1,
              };
            case 'goerli':
              return {
                configuration: {
                  chainId: '0x5',
                },
                blockTracker: blockTrackerFromHookStub2,
              };
            default:
              throw new Error('unexpected networkClientId');
          }
        });

      accountTracker = new AccountTracker({
        provider,
        blockTracker: blockTrackerStub,
        getNetworkClientById: getNetworkClientByIdStub,
        getNetworkIdentifier: jest.fn(),
        preferencesController: {
          store: {
            getState: () => ({
              useMultiAccountBalanceChecker,
            }),
            subscribe: noop,
          },
        },
        onboardingController: {
          store: {
            subscribe: noop,
            getState: noop,
          },
        },
        onAccountRemoved: (callback) => {
          accountRemovedListener = callback;
        },
        getCurrentChainId: () => currentChainId,
      });

      jest.spyOn(accountTracker, '_updateAccounts').mockResolvedValue();

      accountTracker.startPollingByNetworkClientId('mainnet');

      accountTracker.startPollingByNetworkClientId('goerli');

      accountTracker.stopAllPolling();

      expect(blockTrackerStub.removeListener).toHaveBeenCalledWith(
        'latest',
        accountTracker._updateForBlock,
      );
      expect(blockTrackerFromHookStub1.removeListener).toHaveBeenCalledWith(
        'latest',
        expect.any(Function),
      );
      expect(blockTrackerFromHookStub2.removeListener).toHaveBeenCalledWith(
        'latest',
        expect.any(Function),
      );
    });
  });

  describe('_updateAccount', () => {
    it('should update the passed address account balance, and leave other balances unchanged, if useMultiAccountBalanceChecker is true', async () => {
      useMultiAccountBalanceChecker = true;
      accountTracker.store.updateState({
        accounts: { ...mockAccounts },
      });

      await accountTracker._updateAccount(
        VALID_ADDRESS,
        provider,
        currentChainId,
      );

      const newState = accountTracker.store.getState();

      const accounts = {
        [VALID_ADDRESS]: { address: VALID_ADDRESS, balance: UPDATE_BALANCE },
        [VALID_ADDRESS_TWO]: {
          address: VALID_ADDRESS_TWO,
          balance: INITIAL_BALANCE_2,
        },
      };

      expect(newState).toStrictEqual({
        accounts,
        accountsByChainId: {
          [currentChainId]: accounts,
        },
        currentBlockGasLimit: '',
        currentBlockGasLimitByChainId: {},
      });
    });

    it('should not change accounts if the passed address is not in accounts', async () => {
      accountTracker.store.updateState({
        accounts: { ...mockAccounts },
      });

      await accountTracker._updateAccount(
        'fake address',
        provider,
        currentChainId,
      );

      const newState = accountTracker.store.getState();

      const accounts = {
        [VALID_ADDRESS]: {
          address: VALID_ADDRESS,
          balance: INITIAL_BALANCE_1,
        },
        [VALID_ADDRESS_TWO]: {
          address: VALID_ADDRESS_TWO,
          balance: INITIAL_BALANCE_2,
        },
      };

      expect(newState).toStrictEqual({
        accounts,
        accountsByChainId: {},
        currentBlockGasLimit: '',
        currentBlockGasLimitByChainId: {},
      });
    });

    it('should update the passed address account balance, and set other balances to null, if useMultiAccountBalanceChecker is false', async () => {
      useMultiAccountBalanceChecker = false;
      accountTracker.store.updateState({
        accounts: { ...mockAccounts },
      });

      await accountTracker._updateAccount(
        VALID_ADDRESS,
        provider,
        currentChainId,
      );

      const newState = accountTracker.store.getState();

      const accounts = {
        [VALID_ADDRESS]: { address: VALID_ADDRESS, balance: UPDATE_BALANCE },
        [VALID_ADDRESS_TWO]: { address: VALID_ADDRESS_TWO, balance: null },
      };

      expect(newState).toStrictEqual({
        accounts,
        accountsByChainId: {
          [currentChainId]: accounts,
        },
        currentBlockGasLimit: '',
        currentBlockGasLimitByChainId: {},
      });
    });
  });

  describe('_updateForBlockByNetworkClientId', () => {
    it('updates currentBlockGasLimit, currentBlockGasLimitByChainId, and accounts when no networkClientId is passed', async () => {
      const updateAccountsWithNetworkClientIdSpy = jest
        .spyOn(accountTracker, '_updateAccounts')
        .mockResolvedValue();

      await accountTracker._updateForBlockByNetworkClientId(
        null,
        'blockNumber',
      );

      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenCalledWith(null);

      const newState = accountTracker.store.getState();

      expect(newState).toStrictEqual({
        accounts: {},
        accountsByChainId: {},
        currentBlockGasLimit: GAS_LIMIT,
        currentBlockGasLimitByChainId: {
          [currentChainId]: GAS_LIMIT,
        },
      });
    });

    it('updates only the currentBlockGasLimitByChainId and accounts when a networkClientId is passed', async () => {
      const updateAccountsWithNetworkClientIdSpy = jest
        .spyOn(accountTracker, '_updateAccounts')
        .mockResolvedValue();

      await accountTracker._updateForBlockByNetworkClientId(
        'mainnet',
        'blockNumber',
      );

      expect(updateAccountsWithNetworkClientIdSpy).toHaveBeenCalledWith(
        'mainnet',
      );

      const newState = accountTracker.store.getState();

      expect(newState).toStrictEqual({
        accounts: {},
        accountsByChainId: {},
        currentBlockGasLimit: '',
        currentBlockGasLimitByChainId: {
          '0x1': GAS_LIMIT_HOOK,
        },
      });
    });
  });

  describe('_updateAccounts', () => {
    let updateAccountSpy, updateAccountsViaBalanceCheckerSpy;

    beforeEach(() => {
      completedOnboarding = true;
      updateAccountSpy = jest
        .spyOn(accountTracker, '_updateAccount')
        .mockResolvedValue();
      updateAccountsViaBalanceCheckerSpy = jest
        .spyOn(accountTracker, '_updateAccountsViaBalanceChecker')
        .mockResolvedValue();
    });

    it('does not update accounts if completedOnBoarding is false', async () => {
      completedOnboarding = false;

      await accountTracker._updateForBlockByNetworkClientId();

      expect(updateAccountSpy).not.toHaveBeenCalled();
      expect(updateAccountsViaBalanceCheckerSpy).not.toHaveBeenCalled();
    });

    describe('chain does not have single call balance address', () => {
      beforeEach(() => {
        accountTracker = new AccountTracker({
          provider,
          blockTracker: blockTrackerStub,
          getNetworkClientById: getNetworkClientByIdStub,
          getNetworkIdentifier: getNetworkIdentifierStub,
          preferencesController: {
            store: {
              getState: () => ({
                useMultiAccountBalanceChecker,
              }),
              subscribe: noop,
            },
            getSelectedAddress: () => SELECTED_ADDRESS,
          },
          onboardingController: {
            store: {
              subscribe: noop,
              getState: () => ({
                completedOnboarding,
              }),
            },
          },
          onAccountRemoved: (callback) => {
            accountRemovedListener = callback;
          },
          getCurrentChainId: () => '0x123',
        });
        updateAccountSpy = jest
          .spyOn(accountTracker, '_updateAccount')
          .mockResolvedValue();
        updateAccountsViaBalanceCheckerSpy = jest
          .spyOn(accountTracker, '_updateAccountsViaBalanceChecker')
          .mockResolvedValue();

        accountTracker.store.updateState({
          accounts: { ...mockAccounts },
        });
      });

      describe('when useMultiAccountBalanceChecker is true', () => {
        it('updates all accounts directly', async () => {
          useMultiAccountBalanceChecker = true;

          await accountTracker._updateForBlockByNetworkClientId();

          expect(updateAccountsViaBalanceCheckerSpy).not.toHaveBeenCalled();
          expect(updateAccountSpy).toHaveBeenCalledWith(
            VALID_ADDRESS,
            provider,
            '0x123',
          );
          expect(updateAccountSpy).toHaveBeenCalledWith(
            VALID_ADDRESS_TWO,
            provider,
            '0x123',
          );
        });
      });
      describe('when useMultiAccountBalanceChecker is false', () => {
        it('updates only the selectedAddress directly', async () => {
          useMultiAccountBalanceChecker = false;

          await accountTracker._updateForBlockByNetworkClientId();

          expect(updateAccountsViaBalanceCheckerSpy).not.toHaveBeenCalled();
          expect(updateAccountSpy).toHaveBeenCalledWith(
            SELECTED_ADDRESS,
            provider,
            '0x123',
          );
        });
      });
    });

    describe('chain does have single call balance address but network is localhost', () => {
      beforeEach(() => {
        getNetworkIdentifierStub = jest
          .fn()
          .mockReturnValue('http://127.0.0.1:8545');
        accountTracker = new AccountTracker({
          provider,
          blockTracker: blockTrackerStub,
          getNetworkClientById: getNetworkClientByIdStub,
          getNetworkIdentifier: getNetworkIdentifierStub,
          preferencesController: {
            store: {
              getState: () => ({
                useMultiAccountBalanceChecker,
              }),
              subscribe: noop,
            },
            getSelectedAddress: () => SELECTED_ADDRESS,
          },
          onboardingController: {
            store: {
              subscribe: noop,
              getState: () => ({
                completedOnboarding,
              }),
            },
          },
          onAccountRemoved: (callback) => {
            accountRemovedListener = callback;
          },
          getCurrentChainId: () => currentChainId,
        });
        updateAccountSpy = jest
          .spyOn(accountTracker, '_updateAccount')
          .mockResolvedValue();
        updateAccountsViaBalanceCheckerSpy = jest
          .spyOn(accountTracker, '_updateAccountsViaBalanceChecker')
          .mockResolvedValue();

        accountTracker.store.updateState({
          accounts: { ...mockAccounts },
        });
      });

      describe('when useMultiAccountBalanceChecker is true', () => {
        it('updates all accounts directly', async () => {
          useMultiAccountBalanceChecker = true;

          await accountTracker._updateForBlockByNetworkClientId();

          expect(updateAccountsViaBalanceCheckerSpy).not.toHaveBeenCalled();
          expect(updateAccountSpy).toHaveBeenCalledWith(
            VALID_ADDRESS,
            provider,
            '0x5',
          );
          expect(updateAccountSpy).toHaveBeenCalledWith(
            VALID_ADDRESS_TWO,
            provider,
            '0x5',
          );
        });
      });

      describe('when useMultiAccountBalanceChecker is false', () => {
        it('updates only the selectedAddress directly', async () => {
          useMultiAccountBalanceChecker = false;

          await accountTracker._updateForBlockByNetworkClientId('mainnet');

          expect(updateAccountsViaBalanceCheckerSpy).not.toHaveBeenCalled();
          expect(updateAccountSpy).toHaveBeenCalledWith(
            SELECTED_ADDRESS,
            providerFromHook,
            '0x1',
          );
        });
      });
    });

    describe('chain does have single call balance address and network is not localhost', () => {
      beforeEach(() => {
        accountTracker.store.updateState({
          accounts: { ...mockAccounts },
        });
      });

      describe('when useMultiAccountBalanceChecker is true', () => {
        it('updates all accounts via balance checker', async () => {
          useMultiAccountBalanceChecker = true;

          await accountTracker._updateForBlockByNetworkClientId('mainnet');

          expect(updateAccountsViaBalanceCheckerSpy).toHaveBeenCalledWith(
            [VALID_ADDRESS, VALID_ADDRESS_TWO],
            SINGLE_CALL_BALANCES_ADDRESSES['0x1'],
            providerFromHook,
            '0x1',
          );
          expect(updateAccountSpy).not.toHaveBeenCalled();
        });
      });

      describe('when useMultiAccountBalanceChecker is false', () => {
        it('updates only the selectedAddress via balance checker', async () => {
          useMultiAccountBalanceChecker = false;

          await accountTracker._updateForBlockByNetworkClientId('mainnet');

          expect(updateAccountsViaBalanceCheckerSpy).toHaveBeenCalledWith(
            [SELECTED_ADDRESS],
            SINGLE_CALL_BALANCES_ADDRESSES['0x1'],
            providerFromHook,
            '0x1',
          );
          expect(updateAccountSpy).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('onAccountRemoved', () => {
    it('should remove an account from state', () => {
      accountTracker.store.updateState({
        accounts: { ...mockAccounts },
        accountsByChainId: {
          [currentChainId]: {
            ...mockAccounts,
          },
          '0x1': {
            ...mockAccounts,
          },
          '0x2': {
            ...mockAccounts,
          },
        },
      });

      accountRemovedListener(VALID_ADDRESS);

      const newState = accountTracker.store.getState();

      const accounts = {
        [VALID_ADDRESS_TWO]: mockAccounts[VALID_ADDRESS_TWO],
      };

      expect(newState).toStrictEqual({
        accounts,
        accountsByChainId: {
          [currentChainId]: accounts,
          '0x1': accounts,
          '0x2': accounts,
        },
        currentBlockGasLimit: '',
        currentBlockGasLimitByChainId: {},
      });
    });
  });

  describe('clearAccounts', () => {
    it('should reset state', () => {
      accountTracker.store.updateState({
        accounts: { ...mockAccounts },
        accountsByChainId: {
          [currentChainId]: {
            ...mockAccounts,
          },
          '0x1': {
            ...mockAccounts,
          },
          '0x2': {
            ...mockAccounts,
          },
        },
      });

      accountTracker.clearAccounts();

      const newState = accountTracker.store.getState();

      expect(newState).toStrictEqual({
        accounts: {},
        accountsByChainId: {
          [currentChainId]: {},
          '0x1': {},
          '0x2': {},
        },
        currentBlockGasLimit: '',
        currentBlockGasLimitByChainId: {},
      });
    });
  });

  describe('_updateAccountsViaBalanceChecker', () => {
    it('should update the passed address account balance, and set other balances to null, if useMultiAccountBalanceChecker is false', async () => {
      useMultiAccountBalanceChecker = true;
      accountTracker.store.updateState({
        accounts: { ...mockAccounts },
      });

      await accountTracker._updateAccountsViaBalanceChecker(
        [VALID_ADDRESS],
        SINGLE_CALL_BALANCES_ADDRESSES[currentChainId],
        provider,
        currentChainId,
      );

      const newState = accountTracker.store.getState();

      const accounts = {
        [VALID_ADDRESS]: {
          address: VALID_ADDRESS,
          balance: EXPECTED_CONTRACT_BALANCE_1,
        },
        [VALID_ADDRESS_TWO]: { address: VALID_ADDRESS_TWO, balance: null },
      };

      expect(newState).toStrictEqual({
        accounts,
        accountsByChainId: {
          [currentChainId]: accounts,
        },
        currentBlockGasLimit: '',
        currentBlockGasLimitByChainId: {},
      });
    });

    it('should update all balances if useMultiAccountBalanceChecker is true', async () => {
      useMultiAccountBalanceChecker = true;
      accountTracker.store.updateState({
        accounts: { ...mockAccounts },
      });

      await accountTracker._updateAccountsViaBalanceChecker(
        [VALID_ADDRESS, VALID_ADDRESS_TWO],
        SINGLE_CALL_BALANCES_ADDRESSES[currentChainId],
        provider,
        currentChainId,
      );

      const newState = accountTracker.store.getState();

      const accounts = {
        [VALID_ADDRESS]: {
          address: VALID_ADDRESS,
          balance: EXPECTED_CONTRACT_BALANCE_1,
        },
        [VALID_ADDRESS_TWO]: {
          address: VALID_ADDRESS_TWO,
          balance: EXPECTED_CONTRACT_BALANCE_2,
        },
      };

      expect(newState).toStrictEqual({
        accounts,
        accountsByChainId: {
          [currentChainId]: accounts,
        },
        currentBlockGasLimit: '',
        currentBlockGasLimitByChainId: {},
      });
    });
  });
});
