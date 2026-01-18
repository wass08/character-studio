import React from "react";

const LoadingScreen = () => {
  const loading = useConfiguratorStore((state) => state.loading);

  return (
    <>
      <div className="loading-screen">loading brotha</div>
    </>
  );
};

export default LoadingScreen;
