import React from 'react';

const LoadingSpinner = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[50vh] p-12 animate-fade-in">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-primary/10"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
      <p className="font-medium text-secondary tracking-widest uppercase text-sm animate-pulse">
        {text}
      </p>
    </div>
  );
};

export default LoadingSpinner;
