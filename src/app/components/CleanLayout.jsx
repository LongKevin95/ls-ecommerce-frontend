import { Outlet } from "react-router-dom";

import CleanFooter from "./CleanFooter";
import CleanHeader from "./CleanHeader";

export default function CleanLayout() {
  return (
    <div className="clean-shell">
      <CleanHeader />
      <main className="clean-main">
        <Outlet />
      </main>
      <CleanFooter />
    </div>
  );
}
