import React from "react";
import SugarOptimizer from "../../components/SugarOptimizer";
import "./SugarPage.css";

const SugarPage = ({ appState, setAppState }) => {
  // 필요하면 App에서 state 내려주고, 아니면 내부 state 써도 됨
  return <SugarOptimizer appState={appState} setAppState={setAppState} />;
};

export default SugarPage;
