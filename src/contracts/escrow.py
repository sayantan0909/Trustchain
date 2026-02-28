from pyteal import *

def escrow_program():
    # Global state keys
    client_key = Bytes("client")
    freelancer_key = Bytes("freelancer")
    milestones_total_key = Bytes("milestones_total")
    milestones_completed_key = Bytes("milestones_completed")
    amount_per_milestone_key = Bytes("amount_per_milestone")

    @Subroutine(TealType.none)
    def pay_freelancer(amount: Expr, freelancer_address: Expr):
        return Seq(
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: freelancer_address,
                TxnField.amount: amount,
            }),
            InnerTxnBuilder.Submit()
        )

    # Initialization
    handle_creation = Seq(
        App.globalPut(client_key, Txn.application_args[0]),
        App.globalPut(freelancer_key, Txn.application_args[1]),
        App.globalPut(milestones_total_key, Btoi(Txn.application_args[2])),
        App.globalPut(milestones_completed_key, Int(0)),
        App.globalPut(amount_per_milestone_key, Btoi(Txn.application_args[3])),
        Approve()
    )

    # approve_milestone method
    # Only client can approve
    # Expects: arg[0] = "approve", accounts[1] = freelancer address
    handle_approve = Seq(
        Assert(Txn.sender() == App.globalGet(client_key)),
        Assert(App.globalGet(milestones_completed_key) < App.globalGet(milestones_total_key)),
        Assert(Txn.accounts.length() > Int(1)),
        pay_freelancer(App.globalGet(amount_per_milestone_key), Txn.accounts[1]),
        App.globalPut(milestones_completed_key, App.globalGet(milestones_completed_key) + Int(1)),
        Approve()
    )

    # refund method
    # Only client can refund remaining funds
    handle_refund = Seq(
        Assert(Txn.sender() == App.globalGet(client_key)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: App.globalGet(client_key),
            TxnField.amount: Balance(Global.current_application_address()) - Global.min_balance(),
            TxnField.close_remainder_to: App.globalGet(client_key),
        }),
        InnerTxnBuilder.Submit(),
        Approve()
    )

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_refund], # Delete can trigger refund
        [Txn.application_args[0] == Bytes("approve"), handle_approve],
        [Txn.application_args[0] == Bytes("refund"), handle_refund],
    )

    return program

def clear_state_program():
    return Approve()

if __name__ == "__main__":
    with open("escrow_approval.teal", "w") as f:
        compiled = compileTeal(escrow_program(), mode=Mode.Application, version=8)
        f.write(compiled)

    with open("escrow_clear.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
        f.write(compiled)
