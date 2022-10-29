import { useState } from "react";
import { microAlgosToString, stringToMicroAlgos } from "../utils/conversions";
import { toast } from "react-toastify";

const Main = (props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [goal, setGoal] = useState(0);
  const [amount, setAmount] = useState(0);

  const submitHandler = (event) => {
    event.preventDefault();
    props.addDonations({ title, description, image, goal: stringToMicroAlgos(goal) });
  };

  const donateHandler = (project) => {
    if (!amount) {
      toast.error("Amount is not valid");
      return;
    }
    props.donate(project, amount);
  };

  const pauseHandler = (project) => {
    props.pause(project);
  };

  const resumeHandler = (project) => {
    props.resume(project);
  };
  return (
    <>
      <main>
        <section className="py-5 text-center container">
          <div className="row py-lg-5">
            <div className="col-lg-6 col-md-8 mx-auto">
              <h1 className="fw-light">Welcome to Donater</h1>
              <p className="lead text-muted">
                We are a community dedicated to helping the less privilege and we raise
                money for people who need our help. Join us today
                make the world a better place
              </p>
              <p>
                <a href="#" className="btn btn-primary my-2">
                  Donate Today
                </a>
              </p>
            </div>
          </div>
        </section>
        <div className="album py-5 bg-light">
          <div className="container">
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
              {props.donations.map((donation) => (
                <div className="col">
                  <div className="card shadow-sm">
                    <img
                      src={donation.image}
                      className="bd-placeholder-img card-img-top"
                      width="100%"
                      height={225}
                      aria-label="Placeholder: Thumbnail"
                      preserveAspectRatio="xMidYMid slice"
                      focusable="false"
                    />
                    <div className="card-body">
                      <h3>{donation.title}</h3>
                      <p className="card-text">{donation.description}</p>

                      <div className="d-flex justify-content-between align-items-center">
                        <h6>Goal: {microAlgosToString(donation.goal)}ALGO</h6>
                        <h6>
                          Amount Donated: {microAlgosToString(donation.amount_donated)}ALGO
                        </h6>
                      </div>
                      {!donation.isGoalReached && donation.isReceiving === 1 && <div className="mb-3">
                        <label>Donate Amount</label>
                        <input
                          type="text"
                          className="form-control"
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>}
                      <div className="btn-group">
                        {donation.goal_reached === 0 ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => donateHandler(donation)}
                          >
                            Donate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            disabled
                          >
                            Goal Reached
                          </button>
                        )}
                      </div>
                      {props.address === donation.owner && <div>{ donation.isReceiving === 1 ? <div className="btn-group">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => pauseHandler(donation)}
                        >
                          Pause Donations
                        </button>
                      </div> : <div className="btn-group">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => resumeHandler(donation)}
                        >
                          Resume Donations
                        </button>
                      </div>}
                      </div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <div
        className="modal modal-signin position-static d-block bg-secondary py-5"
        tabIndex={-1}
        role="dialog"
        id="modalSignin"
      >
        <div className="modal-dialog" role="document">
          <div className="modal-content rounded-5 shadow">
            <div className="modal-header p-5 pb-4 border-bottom-0">
              {/* <h5 class="modal-title">Modal title</h5> */}
              <h2 className="fw-bold mb-0">Add A Project</h2>
            </div>
            <div className="modal-body p-5 pt-0">
              <form onSubmit={submitHandler} className>
                <div className="form-floating mb-3">
                  <input
                    onChange={(e) => setTitle(e.target.value)}
                    type="text"
                    required
                    className="form-control rounded-4"
                    id="floatingInput"
                    placeholder=""
                  />
                  <label htmlFor="floatingInput">Name of Project</label>
                </div>
                <div className="form-floating mb-3">
                  <input
                    onChange={(e) => setDescription(e.target.value)}
                    type="text"
                    required
                    className="form-control rounded-4"
                    id="floatingInput"
                    placeholder=""
                  />
                  <label htmlFor="floatingInput">Description</label>
                </div>
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    onChange={(e) => setImage(e.target.value)}
                    required
                    className="form-control rounded-4"
                    id="floatingInput"
                    placeholder=""
                  />
                  <label htmlFor="floatingInput">Image</label>
                </div>
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    onChange={(e) => setGoal(e.target.value)}
                    required
                    className="form-control rounded-4"
                    id="floatingInput"
                    placeholder=""
                  />
                  <label htmlFor="floatingInput">Goal to be reached (ALGO)</label>
                </div>
                <button
                  className="w-100 mb-2 btn btn-lg rounded-4 btn-primary"
                  type="submit"
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Main;
