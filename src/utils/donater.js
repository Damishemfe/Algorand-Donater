import algosdk from "algosdk";
import {
    algodClient,
    indexerClient,
    marketplaceNote,
    minRound,
    myAlgoConnect,
    numGlobalBytes,
    numGlobalInts,
    numLocalBytes,
    numLocalInts
} from "./constants";
/* eslint import/no-webpack-loader-syntax: off */
import approvalProgram from "!!raw-loader!../contracts/donater_approval.teal";
import clearProgram from "!!raw-loader!../contracts/donater_clear.teal";
import { base64ToUTF8String, getAddress, utf8ToBase64String } from "./conversions";

class Donater {
    constructor(creator, owner, title, description, image, goal, amount_donated, goal_reached, isReceiving, appId) {
        this.creator = creator;
        this.owner = owner;
        this.title = title;
        this.description = description;
        this.image = image;
        this.goal = goal;
        this.amount_donated = amount_donated;
        this.goal_reached = goal_reached;
        this.isReceiving = isReceiving
        this.appId = appId;
    }
}

const compileProgram = async (programSource) => {
    let encoder = new TextEncoder();
    let programBytes = encoder.encode(programSource);
    let compileResponse = await algodClient.compile(programBytes).do();
    return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
}

// ADD donation: ApplicationCreateTxn
export const addDonationAction = async (senderAddress, project) => {
    console.log("Adding donation...")

    let params = await algodClient.getTransactionParams().do();
    params.fee = algosdk.ALGORAND_MIN_TX_FEE;
    params.flatFee = true;

    // Compile programs
    const compiledApprovalProgram = await compileProgram(approvalProgram)
    const compiledClearProgram = await compileProgram(clearProgram)

    // Build note to identify transaction later and required app args as Uint8Arrays
    let note = new TextEncoder().encode(marketplaceNote);
    let title = new TextEncoder().encode(project.title);
    let description = new TextEncoder().encode(project.description);
    let goal = algosdk.encodeUint64(project.goal);
    let image = new TextEncoder().encode(project.image);


    // set the transaction arguments
    let appArgs = [title, description, image, goal]

    // Create ApplicationCreateTxn
    let txn = algosdk.makeApplicationCreateTxnFromObject({
        from: senderAddress,
        suggestedParams: params,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: compiledApprovalProgram,
        clearProgram: compiledClearProgram,
        numLocalInts: numLocalInts,
        numLocalByteSlices: numLocalBytes,
        numGlobalInts: numGlobalInts,
        numGlobalByteSlices: numGlobalBytes,
        note: note,
        appArgs: appArgs
    });

    // Get transaction ID
    let txId = txn.txID().toString();

    // Sign & submit the transaction
    let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
    console.log("Signed transaction with txID: %s", txId);
    await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

    // Get created application id and notify about completion
    let transactionResponse = await algodClient.pendingTransactionInformation(txId).do();
    let appId = transactionResponse['application-index'];
    console.log("Created new app-id: ", appId);
    return appId;
}

// Donate to Project: Group transaction consisting of ApplicationCallTxn and PaymentTxn
export const donateAction = async (senderAddress, project, donation_amount) => {

    let params = await algodClient.getTransactionParams().do();
    params.fee = algosdk.ALGORAND_MIN_TX_FEE;
    params.flatFee = true;

    // Build required app args as Uint8Array
    let donateArgt = new TextEncoder().encode("donate")
    let donationAmount = algosdk.encodeUint64(parseInt(donation_amount));
    let appArgs = [donateArgt, donationAmount]

    // Create ApplicationCallTxn
    let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: senderAddress,
        appIndex: project.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams: params,
        appArgs: appArgs
    })

    // Create PaymentTxn
    let paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: senderAddress,
        to: project.owner,
        amount: donation_amount,
        suggestedParams: params
    })

    let txnArray = [appCallTxn, paymentTxn]

    // Create group transaction out of previously build transactions
    let groupID = algosdk.computeGroupID(txnArray)
    for (let i = 0; i < 2; i++) txnArray[i].group = groupID;

    // Sign & submit the group transaction
    let signedTxn = await myAlgoConnect.signTransaction(txnArray.map(txn => txn.toByte()));
    console.log("Signed group transaction");
    let tx = await algodClient.sendRawTransaction(signedTxn.map(txn => txn.blob)).do();

    // Wait for group transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 4);

    // Notify about completion
    console.log("Group transaction " + tx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
}

export const pauseAction = async (senderAddress, project) => {
    console.log("Pausing...");

    let params = await algodClient.getTransactionParams().do();
    params.fee = algosdk.ALGORAND_MIN_TX_FEE;
    params.flatFee = true;

    // Build required app args as Uint8Array
    let pauseArgt = new TextEncoder().encode("pause")
    let appArgs = [pauseArgt]

    // Create ApplicationCallTxn
    let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: senderAddress,
        appIndex: project.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams: params,
        appArgs: appArgs
    })

    let txId = appCallTxn.txID().toString();

    // Sign & submit the transaction
    let signedTxn = await myAlgoConnect.signTransaction(appCallTxn.toByte());
    console.log("Signed transaction with txID: %s", txId);
    await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
}

export const resumeAction = async (senderAddress, project) => {
    console.log("Resuming...");

    let params = await algodClient.getTransactionParams().do();
    params.fee = algosdk.ALGORAND_MIN_TX_FEE;
    params.flatFee = true;

    // Build required app args as Uint8Array
    let resumeArgt = new TextEncoder().encode("resume")
    let appArgs = [resumeArgt]

    // Create ApplicationCallTxn
    let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: senderAddress,
        appIndex: project.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams: params,
        appArgs: appArgs
    })

    let txId = appCallTxn.txID().toString();

    // Sign & submit the transaction
    let signedTxn = await myAlgoConnect.signTransaction(appCallTxn.toByte());
    console.log("Signed transaction with txID: %s", txId);
    await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
}

export const deleteProjectAction = async (senderAddress, index) => {
    console.log("Deleting application...");

    let params = await algodClient.getTransactionParams().do();
    params.fee = algosdk.ALGORAND_MIN_TX_FEE;
    params.flatFee = true;

    // Create ApplicationDeleteTxn
    let txn = algosdk.makeApplicationDeleteTxnFromObject({
        from: senderAddress, suggestedParams: params, appIndex: index,
    });

    // Get transaction ID
    let txId = txn.txID().toString();

    // Sign & submit the transaction
    let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
    console.log("Signed transaction with txID: %s", txId);
    await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for transaction to be confirmed
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

    // Get application id of deleted application and notify about completion
    let transactionResponse = await algodClient.pendingTransactionInformation(txId).do();
    let appId = transactionResponse['txn']['txn'].apid;
    console.log("Deleted app-id: ", appId);
}

export const getProjectAction = async () => {
    console.log("Fetching projects...")
    let note = new TextEncoder().encode(marketplaceNote);
    let encodedNote = Buffer.from(note).toString("base64");

    // Step 1: Get all transactions by notePrefix (+ minRound filter for performance)
    let transactionInfo = await indexerClient.searchForTransactions()
        .notePrefix(encodedNote)
        .txType("appl")
        .minRound(minRound)
        .do();
    let posts = []
    for (const transaction of transactionInfo.transactions) {
        let appId = transaction["created-application-index"]
        if (appId) {
            // Step 2: Get each application by application id
            let post = await getApplication(appId)
            if (post) {
                posts.push(post)
            }
        }
    }
    console.log(posts);
    return posts
}

const getApplication = async (appId) => {
    try {
        // 1. Get application by appId
        let response = await indexerClient.lookupApplications(appId).includeAll(true).do();
        if (response.application.deleted) {
            return null;
        }
        let globalState = response.application.params["global-state"]

        // 2. Parse fields of response and return product
        let creator = response.application.params.creator
        let owner = ""
        let title = ""
        let description = ""
        let image = ""
        let goal = 0
        let amountDonated = 0
        let goal_reached = 0
        let isReceiving = 0


        const getField = (fieldName, globalState) => {
            return globalState.find(state => {
                return state.key === utf8ToBase64String(fieldName);
            })
        }

        if (getField("name", globalState) !== undefined) {
            let field = getField("name", globalState).value.bytes
            title = base64ToUTF8String(field)
        }

        if (getField("desc", globalState) !== undefined) {
            let field = getField("desc", globalState).value.bytes
            description = base64ToUTF8String(field)
        }

        if (getField("image", globalState) !== undefined) {
            let field = getField("image", globalState).value.bytes
            image = base64ToUTF8String(field)
        }

        if (getField("goal", globalState) !== undefined) {
            goal = getField("goal", globalState).value.uint
        }

        if (getField("amount", globalState) !== undefined) {
            amountDonated = getField("amount", globalState).value.uint
        }

        if (getField("reached", globalState) !== undefined) {
            goal_reached = getField("reached", globalState).value.uint
        }

        if (getField("receiving", globalState) !== undefined) {
            isReceiving = getField("receiving", globalState).value.uint
        }

        if (getField("owner", globalState) !== undefined) {
            let field = getField("owner", globalState).value.bytes;
            owner = getAddress(field);
        }

        return new Donater(creator, owner, title, description, image, goal, amountDonated, goal_reached, isReceiving, appId)
    } catch (err) {
        return null;
    }
}