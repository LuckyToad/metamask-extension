import confirmReducer, { UPDATE_CURRENT_CONFIRMATION } from './confirm';

describe('App State', () => {
  const metamaskConfirmState = {
    currentConfirmation: undefined,
  };

  it('app init state', () => {
    const initState = confirmReducer(metamaskConfirmState, {});

    expect.anything(initState);
  });

  it('sets currentConfirmation', () => {
    const currentConfirmation = {
      id: '123',
    };
    const state = confirmReducer(metamaskConfirmState, {
      type: UPDATE_CURRENT_CONFIRMATION,
      currentConfirmation,
    });

    expect(state.currentConfirmation).toStrictEqual(currentConfirmation);
  });
});
