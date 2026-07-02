import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import "./VendorOnboarding.css";

const steps = [
  "Shop Information",
  "Shipping Settings",
  "Identity Information",
  "Tax Information",
  "Finish",
];

const emptyAddress = {
  fullName: "",
  phone: "",
  region: "",
  detail: "",
};

const emptyIdentityInfo = {
  legalName: "",
  idNumber: "",
  issuedDate: "",
  issuedPlace: "",
};

const emptyTaxInfo = {
  businessType: "Individual",
  registeredAddress: "",
  invoiceEmail: "",
  taxCode: "",
};

export default function VendorOnboarding() {
  const { user, updateRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [shopInfo, setShopInfo] = useState(() => ({
    name: String(user?.shopName ?? user?.name ?? "").trim(),
    email: String(user?.email ?? "").trim(),
    phone: String(user?.phone ?? "").trim(),
  }));
  const [pickupAddress, setPickupAddress] = useState(emptyAddress);
  const [addressDraft, setAddressDraft] = useState(emptyAddress);
  const [identityInfo, setIdentityInfo] = useState(emptyIdentityInfo);
  const [taxInfo, setTaxInfo] = useState(() => ({
    ...emptyTaxInfo,
    invoiceEmail: String(user?.email ?? "").trim(),
  }));
  const [errorMessage, setErrorMessage] = useState("");

  const clearErrorMessage = () => {
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const addressLabel = useMemo(() => {
    if (!pickupAddress.fullName) {
      return "No pickup address added yet";
    }

    return `${pickupAddress.fullName} | ${pickupAddress.phone} | ${pickupAddress.region} | ${pickupAddress.detail}`;
  }, [pickupAddress]);

  const progressPercent = useMemo(() => {
    if (steps.length <= 1) {
      return 100;
    }

    return Math.round((currentStep / (steps.length - 1)) * 100);
  }, [currentStep]);

  const currentStepLabel = steps[currentStep] ?? steps[0];

  const handleShopInfoChange = (event) => {
    const { name, value } = event.target;
    setShopInfo((prev) => ({ ...prev, [name]: value }));
    clearErrorMessage();
  };

  const handleOpenModal = () => {
    setAddressDraft(pickupAddress.fullName ? pickupAddress : emptyAddress);
    setShowAddressModal(true);
  };

  const handleCloseModal = () => {
    setShowAddressModal(false);
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setAddressDraft((prev) => ({ ...prev, [name]: value }));
    clearErrorMessage();
  };

  const handleSaveAddress = () => {
    const isValid = Object.values(addressDraft).every((value) => value.trim());

    if (!isValid) {
      window.alert("Please enter the complete pickup address information.");
      return;
    }

    setPickupAddress(addressDraft);
    setShowAddressModal(false);
    clearErrorMessage();
  };

  const handleIdentityChange = (event) => {
    const { name, value } = event.target;
    setIdentityInfo((prev) => ({ ...prev, [name]: value }));
    clearErrorMessage();
  };

  const handleTaxChange = (event) => {
    const { name, value } = event.target;
    setTaxInfo((prev) => ({ ...prev, [name]: value }));
    clearErrorMessage();
  };

  const handleNextFromShop = () => {
    if (!shopInfo.name || !shopInfo.email || !shopInfo.phone) {
      setErrorMessage(
        "Please enter the complete shop information before continuing.",
      );
      return;
    }

    if (!pickupAddress.fullName) {
      setErrorMessage("Please add a pickup address.");
      return;
    }

    setCurrentStep(1);
  };

  const handleFinishTax = () => {
    const isValid = Object.values(taxInfo).every((value) =>
      String(value ?? "").trim(),
    );

    if (!isValid) {
      setErrorMessage(
        "Please enter the complete tax information before finishing.",
      );
      return;
    }

    setCurrentStep(4);
  };

  const handleNextFromIdentity = () => {
    const isValid = Object.values(identityInfo).every((value) =>
      String(value ?? "").trim(),
    );

    if (!isValid) {
      setErrorMessage(
        "Please enter the complete identity information before continuing.",
      );
      return;
    }

    setCurrentStep(3);
  };

  const handleEnterVendorCenter = async () => {
    try {
      await updateRole("vendor", {
        shop: {
          name: shopInfo.name,
          contactEmail: shopInfo.email,
          phone: shopInfo.phone,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["shops"] });
      navigate("/vendor");
    } catch (error) {
      window.alert(
        error?.message ?? "Unable to complete registration. Please try again.",
      );
    }
  };

  return (
    <main className="vendor-onboarding">
      <div className="vendor-container">
        <header className="vendor-header">
          <h1>Register as a Seller</h1>
        </header>

        <section
          className="vendor-progress"
          aria-label="Vendor registration progress"
        >
          <div className="vendor-progress__meta">
            <strong>{currentStepLabel}</strong>
          </div>

          <div
            className="vendor-progress__steps"
            style={{ "--step-count": steps.length }}
          >
            <div className="vendor-progress__track" aria-hidden="true">
              <div
                className="vendor-progress__bar"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {steps.map((label, index) => {
              const stepState =
                index < currentStep
                  ? "is-completed"
                  : index === currentStep
                    ? "is-current"
                    : "is-upcoming";

              return (
                <div key={label} className={`vendor-step ${stepState}`}>
                  <span className="vendor-step__dot" aria-hidden="true">
                    {index < currentStep ? "✓" : index + 1}
                  </span>
                  <span className="vendor-step__label">{label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {currentStep === 0 && (
          <section className="vendor-card">
            <div className="vendor-form">
              <label>
                Shop Name
                <input
                  name="name"
                  type="text"
                  placeholder="Enter shop name"
                  value={shopInfo.name}
                  onChange={handleShopInfoChange}
                />
              </label>

              <div className="vendor-row">
                <label className="vendor-label">
                  Pickup Address
                  <div className="vendor-address">
                    <span>{addressLabel}</span>
                    <button type="button" onClick={handleOpenModal}>
                      + Add
                    </button>
                  </div>
                </label>
              </div>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="Enter email"
                  value={shopInfo.email}
                  onChange={handleShopInfoChange}
                />
              </label>

              <label>
                Phone Number
                <input
                  name="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={shopInfo.phone}
                  onChange={handleShopInfoChange}
                />
              </label>

              {errorMessage && <p className="vendor-error">{errorMessage}</p>}

              <div className="vendor-actions">
                <button type="button" className="btn-muted">
                  Save
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNextFromShop}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {currentStep === 1 && (
          <section className="vendor-card">
            <h2>Shipping Settings</h2>
            <div className="vendor-shipping">
              <div className="shipping-card">
                <div>
                  <h3>Express Delivery</h3>
                  <p>COD is enabled</p>
                </div>
                <div className="shipping-toggles">
                  <label>
                    <input type="checkbox" defaultChecked />
                    <span> Enable this shipping provider</span>
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked />
                    <span> Enable COD</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="vendor-actions vendor-actions--split">
              <button
                type="button"
                className="btn-muted"
                onClick={() => setCurrentStep(0)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  clearErrorMessage();
                  setCurrentStep(2);
                }}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {currentStep === 2 && (
          <section className="vendor-card">
            <div className="vendor-info">
              Please enter the complete basic identity information to continue.
            </div>
            <div className="vendor-tax">
              <label>
                Full Legal Name
                <input
                  name="legalName"
                  type="text"
                  placeholder="Enter full name"
                  value={identityInfo.legalName}
                  onChange={handleIdentityChange}
                />
              </label>
              <label>
                ID Number
                <input
                  name="idNumber"
                  type="text"
                  placeholder="Enter ID number"
                  value={identityInfo.idNumber}
                  onChange={handleIdentityChange}
                />
              </label>
              <label>
                Issue Date
                <input
                  name="issuedDate"
                  type="date"
                  value={identityInfo.issuedDate}
                  onChange={handleIdentityChange}
                />
              </label>
              <label>
                Place of Issue
                <input
                  name="issuedPlace"
                  type="text"
                  placeholder="Enter place of issue"
                  value={identityInfo.issuedPlace}
                  onChange={handleIdentityChange}
                />
              </label>
            </div>
            {errorMessage && <p className="vendor-error">{errorMessage}</p>}
            <div className="vendor-actions vendor-actions--split">
              <button
                type="button"
                className="btn-muted"
                onClick={() => setCurrentStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleNextFromIdentity}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {currentStep === 3 && (
          <section className="vendor-card">
            <div className="vendor-info">
              Please enter the complete tax information to finish registration.
            </div>
            <div className="vendor-tax">
              <label>
                Business Type
                <span> </span>
                <select
                  name="businessType"
                  value={taxInfo.businessType}
                  onChange={handleTaxChange}
                >
                  <option value="Individual">Individual</option>
                  <option value="Household Business">Household Business</option>
                  <option value="Company">Company</option>
                </select>
              </label>
              <label>
                Registered Business Address<span> </span>
                <input
                  name="registeredAddress"
                  type="text"
                  placeholder="Enter address"
                  value={taxInfo.registeredAddress}
                  onChange={handleTaxChange}
                />
              </label>
              <label>
                E-invoice Email<span> </span>
                <input
                  name="invoiceEmail"
                  type="email"
                  placeholder="Enter email"
                  value={taxInfo.invoiceEmail}
                  onChange={handleTaxChange}
                />
              </label>
              <label>
                Tax Code<span> </span>
                <input
                  name="taxCode"
                  type="text"
                  placeholder="Enter tax code"
                  value={taxInfo.taxCode}
                  onChange={handleTaxChange}
                />
              </label>
            </div>
            {errorMessage && <p className="vendor-error">{errorMessage}</p>}
            <div className="vendor-actions vendor-actions--split">
              <button
                type="button"
                className="btn-muted"
                onClick={() => setCurrentStep(2)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleFinishTax}
              >
                Finish
              </button>
            </div>
          </section>
        )}

        {currentStep === 4 && (
          <section className="vendor-card vendor-card--center">
            <div className="vendor-success">
              <div className="success-icon">✓</div>
              <h2>Registration Successful</h2>
              <p>Publish your first product to start your selling journey.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={handleEnterVendorCenter}
              >
                Go to Vendor Center
              </button>
            </div>
          </section>
        )}
      </div>

      {showAddressModal && (
        <div className="vendor-modal" role="dialog" aria-modal="true">
          <div className="vendor-modal__content">
            <div className="vendor-modal__header">
              <h3>Add New Address</h3>
              <button type="button" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className="vendor-modal__body">
              <label>
                Full Name
                <input
                  name="fullName"
                  type="text"
                  placeholder="Enter value"
                  value={addressDraft.fullName}
                  onChange={handleAddressChange}
                />
              </label>
              <label>
                Phone Number
                <input
                  name="phone"
                  type="text"
                  placeholder="Enter value"
                  value={addressDraft.phone}
                  onChange={handleAddressChange}
                />
              </label>
              <label>
                Province/City/District/Ward
                <textarea
                  name="region"
                  placeholder="Select"
                  value={addressDraft.region}
                  onChange={handleAddressChange}
                />
              </label>
              <label>
                Detailed Address
                <textarea
                  name="detail"
                  placeholder="House number, street name..."
                  value={addressDraft.detail}
                  onChange={handleAddressChange}
                />
              </label>
            </div>

            <div className="vendor-modal__actions">
              <button
                type="button"
                className="btn-muted"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveAddress}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
