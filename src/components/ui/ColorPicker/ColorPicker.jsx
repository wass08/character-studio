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
    (state) => state.currentCategory,
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
    (state) => state.currentCategory,
  );
  const customization = useConfiguratorStore((state) => state.customization);

  const detectedSlots = useConfiguratorStore(
    (state) => state.detectedColorSlotsByCategory,
  );
  const categorySlots = detectedSlots[currentCategory?.name] || [];

  const isSkin = currentCategory?.name === "skin";
  const hasAsset = customization[currentCategory?.name]?.asset;

  if (!isSkin && !hasAsset) {
    return null;
  }

  if (isSkin || categorySlots.length === 0) {
    const activeColor =
      customization[currentCategory?.name]?.color || "#ffffff";
    return (
      <div className="color-picker-root">
        <StyledPicker color={activeColor} onChange={(c) => updateColor(c)} />
      </div>
    );
  }

  return (
    <div
      className="color-picker-root"
      style={{ display: "flex", flexDirection: "column", gap: "20px" }}
    >
      {categorySlots.sort().map((slotName) => {
        const activeColor =
          customization[currentCategory?.name]?.colors?.[slotName] ||
          customization[currentCategory?.name]?.color ||
          "#ffffff";

        const label = slotName.replace("Color_", "").replace(/_/g, " ");

        return (
          <div key={slotName} className="slot-picker-container">
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: "600",
                marginBottom: "8px",
                textTransform: "capitalize",
              }}
            >
              {label}
            </div>
            <StyledPicker
              color={activeColor}
              onChange={(c) => updateColor(c, slotName)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ColorPicker;
