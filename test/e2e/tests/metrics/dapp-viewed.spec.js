const { strict: assert } = require('assert');
const {
  defaultGanacheOptions,
  switchToNotificationWindow,
  withFixtures,
  openDapp,
  unlockWallet,
  getEventPayloads,
} = require('../../helpers');
const FixtureBuilder = require('../../fixture-builder');
const {
  MetaMetricsEventName,
} = require('../../../../shared/constants/metametrics');

async function mockSegment(mockServer) {
  return [
    await mockServer
      .forPost('https://api.segment.io/v1/batch')
      .withJsonBodyIncluding({
        batch: [{ type: 'track', event: MetaMetricsEventName.DappViewed }],
      })
      .thenCallback(() => {
        return {
          statusCode: 200,
        };
      }),
    // await mockServer
    //   .forPost('https://api.segment.io/v1/batch')
    //   .withJsonBodyIncluding({
    //     batch: [{ type: 'track', event: MetaMetricsEventName.DappViewed }],
    //   })
    //   .thenCallback(() => {
    //     return {
    //       statusCode: 200,
    //     };
    //   }),
  ];
}

describe('Dapp viewed Event', function () {
  it.only('Successfully tracked when navigating to dapp with no account connected @no-mmi', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withMetaMetricsController({
            metaMetricsId: 'fake-metrics-id',
            participateInMetaMetrics: true,
          })
          .build(),
        defaultGanacheOptions,
        title: this.test.fullTitle(),
        testSpecificMock: mockSegment,
      },
      async ({ driver, mockedEndpoint: mockedEndpoints }) => {
        await driver.navigate();
        await unlockWallet(driver);
        await openDapp(driver);

        const events = await getEventPayloads(driver, mockedEndpoints);

        assert.deepStrictEqual(events[0].properties, {
          category: 'inpage_provider',
          locale: 'en',
          chain_id: '0x539',
          environment_type: 'background',
          number_of_accounts: 1,
          number_of_accounts_connected: 0,
        });
      },
    );
  });

  it('Successfully tracked when navigating to dapp with one account connected @no-mmi', async function () {

    async function newMockSegment(mockServer) {
      return [
        await mockServer
          .forPost('https://api.segment.io/v1/batch')
          .withJsonBodyIncluding({
            batch: [{ type: 'track', event: MetaMetricsEventName.DappViewed }],
          })
          .thenCallback(() => {
            return {
              statusCode: 200,
            };
          }),
        // await mockServer
        //   .forPost('https://api.segment.io/v1/batch')
        //   .withJsonBodyIncluding({
        //     batch: [{ type: 'track', event: 'Permissions Requested' }],
        //   })
        //   .thenCallback(() => {
        //     return {
        //       statusCode: 200,
        //     };
        //   }),
        // await mockServer
        //   .forPost('https://api.segment.io/v1/batch')
        //   .withJsonBodyIncluding({
        //     batch: [{ type: 'track', event: 'Permissions Approved' }],
        //   })
        //   .thenCallback(() => {
        //     return {
        //       statusCode: 200,
        //     };
        //   }),

      ];
    }
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withMetaMetricsController({
            metaMetricsId: 'fake-metrics-id',
            participateInMetaMetrics: true,
          })
          .build(),
        defaultGanacheOptions,
        title: this.test.fullTitle(),
        testSpecificMock: mockSegment,
      },
      async ({ driver, mockedEndpoint: mockedEndpoints }) => {
        await driver.navigate();
        await unlockWallet(driver);
        await openDapp(driver);

        const events = await getEventPayloads(driver, mockedEndpoints);

        assert.deepStrictEqual(events[0].properties, {
          category: 'inpage_provider',
          locale: 'en',
          chain_id: '0x539',
          environment_type: 'background',
          number_of_accounts: 1,
          number_of_accounts_connected: 0,
        });

        // await driver.clickElement({
        //   text: 'Connect',
        //   tag: 'button',
        // });
        //
        // await switchToNotificationWindow(driver);
        // await driver.clickElement({
        //   text: 'Next',
        //   tag: 'button',
        // });
        // await driver.clickElement({
        //   text: 'Connect',
        //   tag: 'button',
        // });
        //
        // const newEvents = await getEventPayloads(driver, mockedEndpoints);
        // console.log({ newEvents })
        // assert.deepStrictEqual(newEvents[0].properties, {
        //   method: 'eth_requestAccounts',
        //   category: 'inpage_provider',
        //   locale: 'en',
        //   chain_id: '0x539',
        //   environment_type: 'background',
        // });
        // assert.deepStrictEqual(newEvents[1].properties, {
        //   method: 'eth_requestAccounts',
        //   category: 'inpage_provider',
        //   locale: 'en',
        //   chain_id: '0x539',
        //   environment_type: 'background',
        // });
      },
    );
  });
});
