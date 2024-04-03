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