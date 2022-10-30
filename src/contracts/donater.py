from pyteal import *


class Donater:
    class Variables:
        title = Bytes("name")
        description = Bytes("desc")
        image = Bytes("image")
        goal = Bytes("goal")
        amountDonated = Bytes("amount")
        goalReached = Bytes("reached")
        isReceiving = Bytes("receiving")

    # app methods
    class AppMethods:
        donate = Bytes("donate")
        pause = Bytes("pause")
        resume = Bytes("resume")

    # creates an application where users are able to donate to support a campaign/project
    def application_creation(self):
        return Seq([
            Assert(Txn.application_args.length() == Int(4)),
            # check for transaction note
            Assert(Txn.note() == Bytes("donater:uvMain1.0")),
            # makes sure that goal is greater than zero
            # makes sure that input data does not contain empty strings/Bytes
            Assert(
                And(
                    Len(Txn.application_args[0]) > Int(0),
                    Len(Txn.application_args[1]) > Int(0),
                    Len(Txn.application_args[2]) > Int(0),
                    Btoi(Txn.application_args[3]) > Int(0),
                )
            ),
            App.globalPut(self.Variables.title, Txn.application_args[0]),
            App.globalPut(self.Variables.description, Txn.application_args[1]),
            App.globalPut(self.Variables.image, Txn.application_args[2]),
            App.globalPut(self.Variables.goal,
                          Btoi(Txn.application_args[3])),
            App.globalPut(self.Variables.amountDonated, Int(0)),
            App.globalPut(self.Variables.goalReached,
                          Int(0)),
            App.globalPut(self.Variables.isReceiving,
                          Int(1)),
            Approve()
        ])

    # allow users to donate to a project/campaign
    def donate(self):
        amount_donated = Btoi(Txn.application_args[1])
        goal = App.globalGet(self.Variables.goal)
        return Seq([
            Assert(
                #checks for group size and 
                And(
                    Global.group_size() == Int(2),
                    # checks length of transactions equals 2
                    Txn.application_args.length() == Int(2),
                    # checks if sender is the campaign's creator/owner
                    Global.creator_address() != Txn.sender(),
                    # checks if donations are allowed to be received
                    App.globalGet(self.Variables.isReceiving) == Int(1)
                ),
            ),
            Assert(
                
                And(
                    Gtxn[1].type_enum() == TxnType.Payment,
                    # makes sure that the receiver is the owner
                    Gtxn[1].receiver() == Global.creator_address(),
                    # makes sure that the amount corresponds to the input
                    Gtxn[1].amount() == Btoi(Txn.application_args[1]),
                    Gtxn[1].sender() == Gtxn[0].sender(),
                )
            ),

            # update amount_donated
            App.globalPut(self.Variables.amountDonated, 
                          App.globalGet(self.Variables.amountDonated) + Btoi(Txn.application_args[1])),    
            # update goal reached if goal is reached        
            If(amount_donated >= goal).Then(App.globalPut(self.Variables.goalReached, Int(1))),
            Approve()
        ])

    # allows the campaign's creator/owner to pause the receival of donations
    def pause(self):
        return Seq([
            Assert(
                And(
                    # check length of transactions equals 1
                    Txn.application_args.length() == Int(1),
                    # is the user the owner
                    Global.creator_address() == Txn.sender(),
                    App.globalGet(self.Variables.isReceiving) == Int(1),
                ),
            ),
            App.globalPut(self.Variables.isReceiving, Int(0)),
            Approve()
        ])
        
    # allows the campaign's creator/owner to resume the receival of donations
    def resume(self):
        return Seq([
            Assert(
                And(
                    Txn.application_args.length() == Int(1),
                    # is the user the owner
                    Global.creator_address() == Txn.sender(),
                    App.globalGet(self.Variables.isReceiving) == Int(0),
                ),
            ),
            App.globalPut(self.Variables.isReceiving, Int(1)),
            Approve()
        ])

    def application_deletion(self):
        return Return(Txn.sender() == Global.creator_address())

    def application_start(self):
        return Cond(
            [Txn.application_id() == Int(0), self.application_creation()],
            [Txn.on_completion() == OnComplete.DeleteApplication,
             self.application_deletion()],
            [Txn.application_args[0] == self.AppMethods.donate, self.donate()],
            [Txn.application_args[0] == self.AppMethods.pause, self.pause()],
            [Txn.application_args[0] == self.AppMethods.resume, self.resume()],

        )

    def approval_program(self):
        return self.application_start()

    def clear_program(self):
        return Return(Int(1))


