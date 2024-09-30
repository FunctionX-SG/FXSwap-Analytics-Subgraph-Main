/* eslint-disable prefer-const */
import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Deposit,
  EmergencyWithdraw,
  Withdraw,
} from "../../generated/MasterchefLiquidity/MasterChef";
import { isSameDate } from "./helpers";
import {
  Bundle,
  MasterchefLiquidityUpdate,
  MasterchefUser,
} from "../../generated/schema";

export function handleDeposit(event: Deposit): void {
  let depositValue = event.params.amount;
  if (depositValue.equals(BigInt.fromI32(0))) {
    return;
  }

  const senderAddressString = event.params.user.toHexString();
  const eventTimestamp = event.block.timestamp;
  let userRecord = MasterchefUser.load(senderAddressString);

  if (!userRecord) {
    userRecord = new MasterchefUser(senderAddressString);
  }

  if (userRecord.lastLiquidityUpdate) {
    const lastLiquidityUpdate = MasterchefLiquidityUpdate.load(
      userRecord.lastLiquidityUpdate!
    )!;
    if (isSameDate(lastLiquidityUpdate.timestamp, eventTimestamp)) {
      lastLiquidityUpdate.accLiquidity =
        lastLiquidityUpdate.accLiquidity.plus(depositValue);
      lastLiquidityUpdate.save();
      return;
    } else {
      depositValue = depositValue.plus(lastLiquidityUpdate.accLiquidity);
    }
  }

  let entity = new MasterchefLiquidityUpdate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.userAddress = senderAddressString;
  entity.accLiquidity = depositValue;
  const bundle = Bundle.load("1");
  if (bundle) {
    entity.liquidityValue = entity.accLiquidity
      .toBigDecimal()
      .times(bundle.ethPrice);
  } else {
    entity.liquidityValue = BigDecimal.fromString("0");
  }
  entity.timestamp = eventTimestamp;
  entity.save();

  userRecord.lastLiquidityUpdate = entity.id;
}

export function handleWithdraw(event: Withdraw): void {
  handleAnyWithdraw(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
    event.params.user,
    event.params.amount,
    event.block.timestamp
  );
}
export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
  handleAnyWithdraw(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
    event.params.user,
    event.params.amount,
    event.block.timestamp
  );
}

function handleAnyWithdraw(
  eventId: Bytes,
  withdrawerAddress: Address,
  withdrawValue: BigInt,
  timestamp: BigInt
): void {
  if (withdrawValue.equals(BigInt.fromI32(0))) {
    return;
  }

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
        lastLiquidityUpdate.accLiquidity.minus(withdrawValue);
      lastLiquidityUpdate.save();
      return;
    } else {
      withdrawValue = withdrawValue.minus(lastLiquidityUpdate.accLiquidity);
    }
  }

  let entity = new MasterchefLiquidityUpdate(eventId);
  entity.accLiquidity = withdrawValue;
  const bundle = Bundle.load("1");
  if (bundle) {
    entity.liquidityValue = entity.accLiquidity
      .toBigDecimal()
      .times(bundle.ethPrice);
  } else {
    entity.liquidityValue = BigDecimal.fromString("0");
  }
  entity.timestamp = eventTimestamp;
  entity.save();

  userRecord.lastLiquidityUpdate = entity.id;
}
