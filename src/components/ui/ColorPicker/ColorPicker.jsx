"use client";
import React from "react";
import { CustomPicker } from "react-color";
import {
  Hue,
  Saturation,
  EditableInput,
} from "react-color/lib/components/common";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import "./ColorPicker.css";

const SaturationPointer = () => (
  <div
    className="saturation-pointer"
    style={{
      width: "12px",
      height: "12px",
      borderRadius: "6px",
      boxShadow: "rgb(255, 255, 255) 0px 0px 0px 1px inset",
      transform: "translate(-6px, -6px)",
    }}
  />
);

const HuePointer = () => (
  <div
    className="hue-pointer"
    style={{
      width: "6px",
      height: "20px",
      backgroundColor: "white",
      borderRadius: "2px",
      transform: "translate(-3px, -2px)",
    }}
  />
);

const CustomColorPicker = (props) => {
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory
  );

  const presetColors = currentCategory?.expand?.colorPalette?.colors || [];

  return (
    <div className="custom-picker-container">
      <div className="saturation-wrapper">
        <Saturation {...props} pointer={SaturationPointer} />
      </div>
      <div className="hue-wrapper">
        <Hue {...props} pointer={HuePointer} />
      </div>

      {presetColors.length > 0 && (
        <div className="swatch-container">
          {presetColors.map((color) => (
            <div
              key={color}
              className="swatch-item"
              style={{ backgroundColor: color }}
              onClick={() => props.onChange(color)}
            />
          ))}
        </div>
      )}

      <div className="input-wrapper">
        <EditableInput
          value={props.hex}
          onChange={(data) => props.onChange(data.hex || data)}
        />
      </div>
    </div>
  );
};

const StyledPicker = CustomPicker(CustomColorPicker);

const ColorPicker = () => {
  const updateColor = useConfiguratorStore((state) => state.updateColor);
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory
  );
  const customization = useConfiguratorStore((state) => state.customization);

  const activeColor =
    customization[currentCategory?.name]?.colorData ||
    customization[currentCategory?.name]?.color ||
    "#ffffff";

  if (!customization[currentCategory?.name]?.asset) return null;

  return (
    <div className="color-picker-root">
      <StyledPicker color={activeColor} onChange={(c) => updateColor(c)} />
    </div>
  );
};

export default ColorPicker;
