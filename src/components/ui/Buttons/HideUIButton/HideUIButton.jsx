import React from "react";
import "./HideUIButton.css";

const HideUIButton = ({ isHidden, setIsHidden }) => {
  return (
    <button
      className="hide-ui-btn glass-card"
      onClick={() => setIsHidden(!isHidden)}
    >
      {isHidden ? "Show UI" : "Hide UI"}
    </button>
  );
};

export default HideUIButton;
