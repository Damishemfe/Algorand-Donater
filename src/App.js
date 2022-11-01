import { useState} from "react";
import { indexerClient, myAlgoConnect } from "./utils/constants";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Footer from "./components/Footer";
import Header from "./components/Header";
import Main from "./components/Main";
import { addDonationAction, getProjectAction, donateAction, pauseAction, resumeAction } from "./utils/donater";
import Cover from "./Cover";
import { stringToMicroAlgos } from "./utils/conversions";


function App() {
  const [address, setAddress] = useState(null);
  const [algoBalance, setAlgoBalance] = useState(0);
  const [donations, setDonations] = useState([]);

  const fetchBalance = async (accountAddress) => {
    indexerClient.lookupAccountByID(accountAddress).do()
      .then(response => {
        const _balance = response.account.amount;
        setAlgoBalance(_balance);
      })
      .catch(error => {
        console.log(error);
        toast(error)
      });
  };

  const connectWallet = async () => {
    myAlgoConnect.connect()
      .then(accounts => {
        const _account = accounts[0];
        setAddress(_account.address);
        fetchBalance(_account.address);
        getDonations();
      }).catch(error => {
        console.log('Could not connect to MyAlgo wallet');
        console.error(error);
        toast(error)
      })
  };

  const getDonations = async () => {
    toast("Getting Donations")
    try {
      const projects = await getProjectAction();
      setDonations(projects)
    } catch (error) {
      console.log(error);
      toast(error)
    }
  };

  const addDonations = async (data) => {
    toast("adding Donations")
    try {
      await addDonationAction(address, data)    
    } catch (error) {
      console.log(error);
      toast.error("Error in Add Function, check logs")
    } finally {
      getDonations();
      fetchBalance()
    }
  }

  const donate = async (data, amount) => {
    toast("Donating...")
    try {
      await donateAction(address, data,stringToMicroAlgos(amount))
    } catch (error) {
      console.log(error);
      toast.error("Error in Donate Function, check logs")
    } finally {
      getDonations();
      fetchBalance();
    }
  }

  const pause = async (data) => {
    toast("Pausing Donations")
    try {
      await pauseAction(address, data)
    } catch (error) {
      console.log(error);
      toast.error("Error in Pause Function, check logs")
    } finally {
      getDonations();
      fetchBalance();
    }
  }

  const resume = async (data) => {
    toast("Resuming Donations")
    try {
      await resumeAction(address, data)
    } catch (error) {
      console.log(error);
      toast.error("Error in Resume Function, check logs")
    } finally {
      getDonations();
      fetchBalance();
    }
  }


  return (
    <>
      {address ? <div>
        <ToastContainer />
        <Header balance={algoBalance} />
        <Main
          addDonations={addDonations}
          donations={donations}
          donate={donate}
          pause={pause}
          resume = {resume}
          address = {address}
        />
        <Footer />

      </div> : <Cover name={"Donater"} coverImg={"https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8ZG9uYXRlfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=600&q=60"} connect={connectWallet} />}

    </>
  );
}
export default App;
