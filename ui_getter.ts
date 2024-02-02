import { bcs } from '@mysten/sui.js';
import { SuiClient } from './src/sui-client';
import { config, pool } from './main';

const uiConfig = {
    Package: '0x64372b54147adb0ac8a603adab92c81e3d732c8cafafa368d8f3ff9dcb6a53af',
};

enum OptionType {
    OptionSupply = 1,
    OptionWithdraw = 2,
    OptionBorrow = 3,
    OptionRepay = 4,
}

enum PoolStatus {
    All = 0,
    Enable = 1,
    Closed = 2,
    NotStarted = 3,
}

export class UIGetter {
    private sui: SuiClient;

    constructor() {
        this.sui = new SuiClient();
        this.structRegistry();
    }

    structRegistry() {
        bcs.registerStructType('IncentiveAPYInfo', {
            asset_id: 'u8',
            apy: 'u256',
            coin_types: 'vector<string>',
        });

        bcs.registerStructType('IncentivePoolInfo', {
            pool_id: 'address',
            funds: 'address',
            phase: 'u64',
            start_at: 'u64',
            end_at: 'u64',
            closed_at: 'u64',
            total_supply: 'u64',
            asset_id: 'u8',
            option: 'u8',
            factor: 'u256',
            distributed: 'u64',
            available: 'u256',
            total: 'u256',
        });

        bcs.registerStructType('IncentivePoolInfoByPhase', {
            phase: 'u64',
            pools: 'vector<IncentivePoolInfo>',
        });

        bcs.registerStructType('UserStateInfo', {
            asset_id: 'u8',
            borrow_balance: 'u256',
            supply_balance: 'u256',
        });
    }

    async getIncentivePools(asset_id: number, option: OptionType, user?: string) {
        const result = await this.sui.moveInspect(
            `${uiConfig.Package}::incentive_getter::get_incentive_pools`,
            [
                '0x06', // clock object id
                config.IncentiveV2, // the incentive object v2
                config.StorageId, // object id of storage
                asset_id,
                option,
                user ? user : '0x0000000000000000000000000000000000000000000000000000000000000000', // If you provide your address, the rewards that have been claimed by your address and the total rewards will be returned.
            ],
            [], // type arguments is null
            'vector<IncentivePoolInfo>' // parse type
        );
        //console.log('The Incentive Pool Array: ', result);
    }

    async getIncentiveAPY(option: OptionType) {
        const result = await this.sui.moveInspect(
            `${uiConfig.Package}::incentive_getter::get_incentive_apy`,
            [
                '0x06', // clock object id
                config.IncentiveV2, // the incentive object v2
                config.StorageId, // object id of storage
                config.PriceOracle, // The price oracle object
                option,
            ],
            [], // type arguments is null
            'vector<IncentiveAPYInfo>' // parse type
        );
        console.log('The Incentive APY: ', result);
    }

    async getIncentivePoolsGroupByPhase(status: PoolStatus, option: OptionType, user?: string) {
        const result = await this.sui.moveInspect(
            `${uiConfig.Package}::incentive_getter::get_incentive_pools_group_by_phase`,
            [
                '0x06', // clock object id
                config.IncentiveV2, // the incentive object v2
                config.StorageId, // object id of storage
                status,
                option,
                user ? user : '0x0000000000000000000000000000000000000000000000000000000000000000',
            ],
            [], // type arguments is null
            'vector<IncentivePoolInfoByPhase>' // parse type
        );
        console.log('The Incentive Pool Info By Phase: ', JSON.stringify(result, null, 2));
    }

    async claim(assetId: number) {
        const result = await this.sui.moveInspect(
            `${config.ProtocolPackage}::incentive_v2::claim_reward`,
            [
                '0x06', // clock object id
                "0xf87a8acb8b81d14307894d12595541a73f19933f88e1326d5be349c7a6f7559c", // the incentive object v2
                "0xa20e18085ce04be8aa722fbe85423f1ad6b1ae3b1be81ffac00a30f1d6d6ab51", // incentiveFundsPool
                "0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe", // object id of storage
                assetId, // 0 = Sui 1=USDC 2=USDT 3=WETH 4=CETUS 5=vSui 6=haSui
                3 // 1 for Save, 3 for Borrow
            ],
            ["0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI"], // type arguments is null
            'string' // parse type
        );
        console.log('claim: ', result);
    }

    async getUserState(address: string) {
        const result = await this.sui.moveInspect(`${uiConfig.Package}::getter::get_user_state`, [config.StorageId, address], [], 'vector<UserStateInfo>');
        console.log('The User State: ', JSON.stringify(result, null, 2));
    }

    async main() {
        //await this.getIncentivePools(pool.sui.assetId, OptionType.OptionSupply); // get all incentive pools issued to supply users in the sui pool
        await this.claim(4);
        await this.claim(5);
        await this.claim(6);
        // await this.getIncentiveAPY(OptionType.OptionSupply); // get the current incentive apy of all supply pools, provide the option type and get the apy, should be div 1e27
        // await this.getIncentivePoolsGroupByPhase(PoolStatus.All, OptionType.OptionSupply); // get the pool aggregated by phase based on status

        //await this.getUserState('0x6112b5cfdc8ca0db16e212ff1481bac2850be48e0e56697105251f8f7e60f8cd');
    }
}

new UIGetter().main();
