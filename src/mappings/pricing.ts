/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from "../types/schema";
import { BigDecimal, Address, BigInt } from "@graphprotocol/graph-ts/index";
import {
  ZERO_BD,
  factoryContract,
  ADDRESS_ZERO,
  ONE_BD,
  UNTRACKED_PAIRS,
} from "./helpers";

// Addresses must all be lower case
const WETH_ADDRESS = "0x80b5a32e4f032b2a058b4f29ec95eefeeb87adcd";
const USDC_WETH_PAIR = "0xb08fd050f877eb0677bf34537c386a720becbc7b";
const DAI_WETH_PAIR = "0xb08fd050f877eb0677bf34537c386a720becbc7b";
const USDT_WETH_PAIR = "0xb08fd050f877eb0677bf34537c386a720becbc7b";

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin
  let daiPair = Pair.load(DAI_WETH_PAIR); // dai is token0
  let usdcPair = Pair.load(USDC_WETH_PAIR); // usdc is token0
  let usdtPair = Pair.load(USDT_WETH_PAIR); // usdt is token1

  // all 3 have been created
  if (daiPair !== null && usdcPair !== null && usdtPair !== null) {
    let totalLiquidityETH = daiPair.reserve1
      .plus(usdcPair.reserve1)
      .plus(usdtPair.reserve1);
    let daiWeight = daiPair.reserve1.div(totalLiquidityETH);
    let usdcWeight = usdcPair.reserve1.div(totalLiquidityETH);
    let usdtWeight = usdtPair.reserve1.div(totalLiquidityETH);
    return daiPair.token1Price
      .times(daiWeight)
      .plus(usdcPair.token1Price.times(usdcWeight))
      .plus(usdtPair.token1Price.times(usdtWeight));

    // Issei: commented out
    // let totalLiquidityETH = daiPair.reserve1
    //   .plus(usdcPair.reserve1)
    //   .plus(usdtPair.reserve0);
    // let daiWeight = daiPair.reserve1.div(totalLiquidityETH);
    // let usdcWeight = usdcPair.reserve1.div(totalLiquidityETH);
    // let usdtWeight = usdtPair.reserve0.div(totalLiquidityETH);
    // return daiPair.token0Price
    //   .times(daiWeight)
    //   .plus(usdcPair.token0Price.times(usdcWeight))
    //   .plus(usdtPair.token1Price.times(usdtWeight));
    // dai and USDC have been created
  } else if (daiPair !== null && usdcPair !== null) {
    let totalLiquidityETH = daiPair.reserve1.plus(usdcPair.reserve1);
    let daiWeight = daiPair.reserve1.div(totalLiquidityETH);
    let usdcWeight = usdcPair.reserve1.div(totalLiquidityETH);
    return daiPair.token0Price
      .times(daiWeight)
      .plus(usdcPair.token0Price.times(usdcWeight));
    // USDC is the only pair so far
  } else if (usdcPair !== null) {
    return usdcPair.token0Price;
  } else {
    return ZERO_BD;
  }
}

// token where amounts should contribute to tracked volume and liquidity
// NOTE: alphabets must all be in lower case

let WHITELIST: string[] = [
  "0x80b5a32e4f032b2a058b4f29ec95eefeeb87adcd", //WFX (Wrapped FX)
  "0x50de24b3f0b3136c50fa8a3b8ebc8bd80a269ce5", // DAI
  "0xce7c54149b6f04e8e6c402045fdbd16418bf4ddd", // USDC
  "0xeceeefcee421d8062ef8d6b4d814efe4dc898265", // USDT
  "0xd567b3d7b8fe3c79a1ad8da978812cfc4fa05e75", // pundix
  "0x5fd55a1b9fc24967c4db09c513c3ba0dfa7ff687", // PURSE
  "0xc8b4d3e67238e38b20d38908646ff6f4f48de5ec", // BAVA
  "0x934b9f502dced1ebf0594c7384eb299bc3ca2be6", // AIMEOW
  "0xd498e747ad8a5451c0842188f75907210ab0540a", // WFF
  "0xb313607b89cb187a57bbf245ceca8c25bc2b2cac", // ROOR
  "0x488b585d98c6f20897c0f9a9310674da0d59df0c", // UNIFART
  "0x5f9edcf76b5fa2374e67fdcc830a9d6b1681d483", // BZZ
  "0x570f7f92b5e127e806495a030ec939f0f95aad11", // CHOP
  "0x8dd1cc0551858e1304c80310139846326e064a34", // BBX
  "0x67b32ed48427c73f780aee0bcc056c98c66c122c", // DAMA
  "0x07f3e6fbfd75d0e570517a71dea11c6714b69082", // FETH
  "0x22960bac2ebf0e147e6a5f4875ec73660e2aae49", // SIC
  "0x5f11de66050ec353c59e715e86fb6f4b53f9e92f", // STRK
  "0x25d6eee7562d7794bfc99c45c28fc5d3c07ec69b", // MOOM
  "0x26a1e7b3d2526fb239bceca92cfc9386026a39b6", // EBC
  "0xc34316c3081d334b03020f225b59e17049879fee", // BYG
  "0xf7510813e6c3cbe137f60f7f236ec5b19bbf2362", // HUAHUA
  "0x8f1b7fdae820a052717d9bf60c834973a96c6031", // melon
  "0xc73736f3bb0b35a5120d43f94d9ddd254650bf98", // MrCrypto
  "0x03d6d12865348ae0f8401f0300d10ffaf39fdf1a", // MissCrypto
  "0x6f94f340c9fbefa28e414824a41a7a8827148307", // COK
  "0xccb313A68da6907b287683fd5FC42469Ca23CbD1", // SKR
  "0x2844e94ee77fca45381117b66a956da3b4d3f4de", // BREAP
  "0x201e8a5a20873acd5443825c1ee076afa21251c8", // ALIN
  "0x5a3cab89e8608b62990dbfd6e3adb1f28aa6ee6b", // CPOTO
  "0x471bc69cbd6aaa04099830a5e92a9d24f9b73216", // DDOG
  "0x64179063f360c4f0ef6bd04a06c68282a14fc7bd", // UNICM
  "0x528cee13354e0748f5e450590aac3183bd5d342f", // PIRC
  "0xfc2ec8c95f7ffd4b3a3858bdf610320639d823d2", // ZMBC
  "0x6c9ce3dcf2ae2898a62e5c219fe7124e6b26b44e", // BBDG
  "0x084b2deeaa51bc0095facf7085ce398a6a0554b1", // PPHC
  "0x74713974c5564537db762c44ecdec72d77635334", // LZRTC
  "0x3d9f5aefbc239a74daaa74e4ee5e67a7bae4e654", // TBDG
  "0x2a5f4e86c361167d3ca9ded6c9c30e9bc7317a8b", // ASTDK
  "0x2b757c05d5297f2d69d409f1ed15bc060432056f", // HAMW
  "0xdd5e368cb563206cd302a530af942f4a6a4a57b3", // CCRT
  "0x1f486fc9691ced963e1d62f48d331acd040df2f8", // GOOGY
  "0x396bf801d33f7fe94aa45528273a676e4225f55c", // ZENG
  "0xd833953a2a08060b39a408b98b5b58f829b7f1e4", // CAFF
  "0xb60a07238f33df50d19a3e71b33005f9fba33466", // AVCDO
  "0x003d67210c0e2764d947b0eb94112949cef71b33", // INVIS
  "0x6309d0ab3bccd79f86a1db8b4821dcf0f2e00a9d", // MCHEEZ
  "0xdd9477ca18858591dbd492d5c6b686009d68e031", // SMNSTR
  "0x0fe01857a122812acb2bee2ec308fcf5ffb86500", // QUKKA
  "0x7da69f65166bc727e22d47b694017455e6b488f8", // NOODL
  "0x749f1933f43ec626ca23cd1d045afa38124c522f", // FLUN
  "0xfcabaae1d6ef10a661b3b0879fc198a903632fc1", // RBDD
  "0xfa383c3ded93ba2bf6ceb48d74832f041fa5b947", // GALAF
  "0x89edc5312821414e9c33dfbce63e2dc13c57583b", // mfer
  "0x54d1e664e8cfff6f6bad9f0de11c4fff1ceecfe0", // DINO
  "0xdea17c380259fba45a2a0bf347599d81c99b56d4", // poop
  "0xe5c408bb81741eb1bacbf3851fefc77435e6526c", // BOBA
  "0x10aeaec2072f36de9b55fa20d6de7a44b7195697", // PEACH
  "0x72ca6ae41718435adf7e8340c85e6da125a57b17", // BUBWR
  "0x5a6a17f69ba52b3c76c7e3773d1a9e5b184533d2", // SLEH
  "0x1577dce2d0ab7cd1fa5a4e400cea10579e239be6", // CZP
  "0x12dba75d257dcfe45c63c3e2018742febafefa2d", // WZZD
  "0x5777b1a0e57c239b2affbc4448dc92378204224d", // OPPABOBA
  "0x28b92e2b546ba371dc83fa4292c26dab5853647d", // WHALE
  "0xbef5db5fc9235abf269155b41269b20b11c7cef9", // KNS
  "0x24d2670011bd6ed2c359756b1245cb1e57bb2282", // BNSI
  "0xdba11d0a76b3d57d99d6b62b454d8d70e9f784b0", // GHA
  "0x10a998e84c9ebe599c45d02a06a372095d5e717b", // GREEN
  "0x0f5cb81d0c4f6d760932badbdde6101786eda6d2", // NINJA
  "0x259deef1a81bb66f58f627fd1c02cee5b2f0abfa", // BFT
  "0x7ecb9ac1a3470f00cb39df5e922d4948000ddc43", // CHIT
  "0x7b86ff5c4e200388d496901ee0a709ce4322469a", // NPC
  "0x366883336e1c00af553d508006a2509b0b632534", // SLPG
  "0x2a655dca8db4b5d0459dc4dfa4dc3f3217514cbd", // SAKE
  "0x3ab8da5fa2d96d751ab18078101ab940c4352d37", // WMBT
  "0xa953ef9c306fa0deb60fb588c973ddfdbebedd08", // FRSB
  "0x9a7bc993425c68c9c3db94a640d0004c3a1d71c1", // PNDA
];

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString("1");
// let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString("400000"); // Issei

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString("1");
// let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString("2"); // Issei

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
  if (token.id == WETH_ADDRESS) {
    return ONE_BD;
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(
      Address.fromString(token.id),
      Address.fromString(WHITELIST[i])
    );
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString())!;
      if (
        // Issei: commented out because of MINIMUM_LIQUIDITY_THRESHOLD_ETH
        pair.token0 == token.id &&
        pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)
      ) {
        let token1 = Token.load(pair.token1)!;
        return pair.token1Price.times(token1.derivedETH as BigDecimal); // return token1 per our token * Eth per token 1
      }
      if (
        // Issei: commented out because of MINIMUM_LIQUIDITY_THRESHOLD_ETH
        pair.token1 == token.id &&
        pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)
      ) {
        let token0 = Token.load(pair.token0)!;
        return pair.token0Price.times(token0.derivedETH as BigDecimal); // return token0 per our token * ETH per token 0
      }
    }
  }
  return ZERO_BD; // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  let bundle = Bundle.load("1")!;
  let price0 = token0.derivedETH!.times(bundle.ethPrice);
  let price1 = token1.derivedETH!.times(bundle.ethPrice);

  // dont count tracked volume on these pairs - usually rebass tokens
  if (UNTRACKED_PAIRS.includes(pair.id)) {
    return ZERO_BD;
  }

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  // if less than 1 LPs, require high minimum reserve amount amount or return 0

  if (pair.liquidityProviderCount.lt(BigInt.fromI32(1))) {
    //if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) { // Issei
    let reserve0USD = pair.reserve0.times(price0);
    let reserve1USD = pair.reserve1.times(price1);
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD;
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (
        reserve0USD
          .times(BigDecimal.fromString("2"))
          .lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)
      ) {
        return ZERO_BD;
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (
        reserve1USD
          .times(BigDecimal.fromString("2"))
          .lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)
      ) {
        return ZERO_BD;
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0
      .times(price0)
      .plus(tokenAmount1.times(price1))
      .div(BigDecimal.fromString("2"));
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0);
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1);
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load("1")!;
  let price0 = token0.derivedETH!.times(bundle.ethPrice);
  let price1 = token1.derivedETH!.times(bundle.ethPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1));
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString("2"));
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

export function isWhitelistToken(token: string): boolean {
  return WHITELIST.includes(token)
}