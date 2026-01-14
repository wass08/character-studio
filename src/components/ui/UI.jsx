import React from "react";

import AssetsBox from "./AssetsBox/AssetsBox";
import "./UI.css";
import DownloadButton from "./DownloadButton/DownloadButton";

const UI = () => {
  return (
    <>
      <DownloadButton />
      <AssetsBox />
    </>
  );
};

export default UI;
