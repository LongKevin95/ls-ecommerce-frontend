import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import "./VendorOnboarding.css";

const steps = [
  "Thông tin Shop",
  "Cài đặt vận chuyển",
  "Thông tin định danh",
  "Thông tin thuế",
  "Hoàn tất",
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
  businessType: "Cá nhân",
  registeredAddress: "",
  invoiceEmail: "",
  taxCode: "",
};

export default function VendorOnboarding() {
  const { user, updateRole } = useAuth();
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
      return "Chưa có địa chỉ lấy hàng";
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
      window.alert("Vui lòng nhập đầy đủ thông tin địa chỉ lấy hàng.");
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
      setErrorMessage("Vui lòng nhập đủ thông tin shop trước khi tiếp tục.");
      return;
    }

    if (!pickupAddress.fullName) {
      setErrorMessage("Vui lòng thêm địa chỉ lấy hàng.");
      return;
    }

    setCurrentStep(1);
  };

  const handleFinishTax = () => {
    const isValid = Object.values(taxInfo).every((value) =>
      String(value ?? "").trim(),
    );

    if (!isValid) {
      setErrorMessage("Vui lòng nhập đầy đủ thông tin thuế trước khi hoàn tất.");
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
        "Vui lòng nhập đầy đủ thông tin định danh trước khi tiếp tục.",
      );
      return;
    }

    setCurrentStep(3);
  };

  const handleEnterVendorCenter = async () => {
    try {
      await updateRole("vendor");
      navigate("/vendor");
    } catch (error) {
      window.alert(
        error?.message ?? "Chưa thể hoàn tất đăng ký. Vui lòng thử lại.",
      );
    }
  };

  return (
    <main className="vendor-onboarding">
      <div className="vendor-container">
        <header className="vendor-header">
          <h1>Đăng ký trở thành Người bán</h1>
        </header>

        <section
          className="vendor-progress"
          aria-label="Tiến trình đăng ký vendor"
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
                Tên Shop
                <input
                  name="name"
                  type="text"
                  placeholder="Nhập tên shop"
                  value={shopInfo.name}
                  onChange={handleShopInfoChange}
                />
              </label>

              <div className="vendor-row">
                <label className="vendor-label">
                  Địa chỉ lấy hàng
                  <div className="vendor-address">
                    <span>{addressLabel}</span>
                    <button type="button" onClick={handleOpenModal}>
                      + Thêm
                    </button>
                  </div>
                </label>
              </div>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="Nhập email"
                  value={shopInfo.email}
                  onChange={handleShopInfoChange}
                />
              </label>

              <label>
                Số điện thoại
                <input
                  name="phone"
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  value={shopInfo.phone}
                  onChange={handleShopInfoChange}
                />
              </label>

              {errorMessage && <p className="vendor-error">{errorMessage}</p>}

              <div className="vendor-actions">
                <button type="button" className="btn-muted">
                  Lưu
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNextFromShop}
                >
                  Tiếp theo
                </button>
              </div>
            </div>
          </section>
        )}

        {currentStep === 1 && (
          <section className="vendor-card">
            <h2>Cài đặt vận chuyển</h2>
            <div className="vendor-shipping">
              <div className="shipping-card">
                <div>
                  <h3>Hỏa tốc</h3>
                  <p>COD đã được kích hoạt</p>
                </div>
                <div className="shipping-toggles">
                  <label>
                    <input type="checkbox" defaultChecked />
                    <span> Kích hoạt đơn vị vận chuyển này</span>
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked />
                    <span> Kích hoạt COD</span>
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
                Quay lại
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  clearErrorMessage();
                  setCurrentStep(2);
                }}
              >
                Tiếp theo
              </button>
            </div>
          </section>
        )}

        {currentStep === 2 && (
          <section className="vendor-card">
            <div className="vendor-info">
              Vui lòng nhập đủ thông tin định danh cơ bản để tiếp tục.
            </div>
            <div className="vendor-tax">
              <label>
                Họ và tên theo giấy tờ
                <input
                  name="legalName"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={identityInfo.legalName}
                  onChange={handleIdentityChange}
                />
              </label>
              <label>
                Số CCCD/CMND
                <input
                  name="idNumber"
                  type="text"
                  placeholder="Nhập số giấy tờ"
                  value={identityInfo.idNumber}
                  onChange={handleIdentityChange}
                />
              </label>
              <label>
                Ngày cấp
                <input
                  name="issuedDate"
                  type="date"
                  value={identityInfo.issuedDate}
                  onChange={handleIdentityChange}
                />
              </label>
              <label>
                Nơi cấp
                <input
                  name="issuedPlace"
                  type="text"
                  placeholder="Nhập nơi cấp"
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
                Quay lại
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleNextFromIdentity}
              >
                Tiếp theo
              </button>
            </div>
          </section>
        )}

        {currentStep === 3 && (
          <section className="vendor-card">
            <div className="vendor-info">
              Vui lòng nhập đủ thông tin thuế để hoàn tất đăng ký.
            </div>
            <div className="vendor-tax">
              <label>
                Loại hình kinh doanh
                <span> </span>
                <select
                  name="businessType"
                  value={taxInfo.businessType}
                  onChange={handleTaxChange}
                >
                  <option value="Cá nhân">Cá nhân</option>
                  <option value="Hộ kinh doanh">Hộ kinh doanh</option>
                  <option value="Công ty">Công ty</option>
                </select>
              </label>
              <label>
                Địa chỉ đăng ký kinh doanh<span> </span>
                <input
                  name="registeredAddress"
                  type="text"
                  placeholder="Nhập địa chỉ"
                  value={taxInfo.registeredAddress}
                  onChange={handleTaxChange}
                />
              </label>
              <label>
                Email nhận hóa đơn điện tử<span> </span>
                <input
                  name="invoiceEmail"
                  type="email"
                  placeholder="Nhập email"
                  value={taxInfo.invoiceEmail}
                  onChange={handleTaxChange}
                />
              </label>
              <label>
                Mã số thuế<span> </span>
                <input
                  name="taxCode"
                  type="text"
                  placeholder="Nhập mã số thuế"
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
                Quay lại
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleFinishTax}
              >
                Hoàn tất
              </button>
            </div>
          </section>
        )}

        {currentStep === 4 && (
          <section className="vendor-card vendor-card--center">
            <div className="vendor-success">
              <div className="success-icon">✓</div>
              <h2>Đăng ký thành công</h2>
              <p>
                Hãy đăng bán sản phẩm đầu tiên để bắt đầu hành trình bán hàng.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={handleEnterVendorCenter}
              >
                Vào Vendor Center
              </button>
            </div>
          </section>
        )}
      </div>

      {showAddressModal && (
        <div className="vendor-modal" role="dialog" aria-modal="true">
          <div className="vendor-modal__content">
            <div className="vendor-modal__header">
              <h3>Thêm Địa Chỉ Mới</h3>
              <button type="button" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className="vendor-modal__body">
              <label>
                Họ & Tên
                <input
                  name="fullName"
                  type="text"
                  placeholder="Nhập vào"
                  value={addressDraft.fullName}
                  onChange={handleAddressChange}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  name="phone"
                  type="text"
                  placeholder="Nhập vào"
                  value={addressDraft.phone}
                  onChange={handleAddressChange}
                />
              </label>
              <label>
                Tỉnh/Thành phố/Quận/Huyện/Phường/Xã
                <textarea
                  name="region"
                  placeholder="Chọn"
                  value={addressDraft.region}
                  onChange={handleAddressChange}
                />
              </label>
              <label>
                Địa chỉ chi tiết
                <textarea
                  name="detail"
                  placeholder="Số nhà, tên đường..."
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
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveAddress}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
