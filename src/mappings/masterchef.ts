import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Deposit,
  EmergencyWithdraw,
  Withdraw,
} from "../../generated/MasterchefLiquidity/MasterChef";
import { BI_18, convertTokenToDecimal, isSameDate, ZERO_BD } from "./helpers";
import {
  Bundle,
  MasterchefLiquidityUpdate,
  MasterchefUser,
} from "../../generated/schema";

export function handleDeposit(event: Deposit): void {
  handleDelta(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
    event.params.user,
    event.params.amount,
    event.block.timestamp
  );
}

export function handleWithdraw(event: Withdraw): void {
  handleDelta(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
    event.params.user,
    event.params.amount.neg(),
    event.block.timestamp
  );
}
export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
  handleDelta(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
    event.params.user,
    event.params.amount.neg(),
    event.block.timestamp
  );
}

function handleDelta(
  eventId: Bytes,
  withdrawerAddress: Address,
  deltaValue: BigInt,
  timestamp: BigInt
): void {
  if (deltaValue.equals(BigInt.fromI32(0))) {
    return;
  }

  const bundle = Bundle.load("1");
  const fxPrice = bundle ? bundle.ethPrice : BigDecimal.fromString("0");

  const withdrawerAddressString = withdrawerAddress.toHexString();
  const eventTimestamp = timestamp;
  let userRecord = MasterchefUser.load(withdrawerAddressString);

  if (!userRecord) {
    return;
  }

  if (userRecord.lastLiquidityUpdate) {
    const lastLiquidityUpdate = MasterchefLiquidityUpdate.load(
      userRecord.lastLiquidityUpdate!
    )!;
    if (isSameDate(lastLiquidityUpdate.timestamp, eventTimestamp)) {
      lastLiquidityUpdate.accLiquidity =
        lastLiquidityUpdate.accLiquidity.plus(deltaValue);
      lastLiquidityUpdate.liquidityValue = fxPrice.equals(ZERO_BD)
        ? ZERO_BD
        : convertTokenToDecimal(lastLiquidityUpdate.accLiquidity, BI_18).times(
            fxPrice
          );
      lastLiquidityUpdate.save();
      return;
    } else {
      deltaValue = lastLiquidityUpdate.accLiquidity.plus(deltaValue);
    }
  }

  const entity = new MasterchefLiquidityUpdate(eventId);
  entity.userAddress = withdrawerAddressString;
  entity.accLiquidity = deltaValue;
  entity.liquidityValue = fxPrice.equals(ZERO_BD)
    ? ZERO_BD
    : convertTokenToDecimal(entity.accLiquidity, BI_18).times(fxPrice);
  entity.timestamp = eventTimestamp;
  entity.save();

  userRecord.lastLiquidityUpdate = entity.id;
  userRecord.save();
}
