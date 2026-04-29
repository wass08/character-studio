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
      width: "9px",
      height: "9px",
      borderRadius: "50%",
      boxShadow: "rgb(255, 255, 255) 0px 0px 0px 1px inset",
      transform: "translate(-4px, -4px)",
    }}
  />
);

const HuePointer = () => (
  <div
    className="hue-pointer"
    style={{
      width: "4px",
      height: "14px",
      backgroundColor: "white",
      borderRadius: "2px",
      transform: "translate(-2px, -2px)",
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

const ColorPicker = ({ inline = false }) => {
  const updateColor = useConfiguratorStore((state) => state.updateColor);
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory,
  );
  const customization = useConfiguratorStore((state) => state.customization);

  const detectedSlots = useConfiguratorStore(
    (state) => state.detectedColorSlotsByCategory,
  );
  const categorySlots = detectedSlots[currentCategory?.name] || [];

  const isSkin = currentCategory?.name === "Skin";
  const hasAsset = customization[currentCategory?.name]?.asset;

  if (!isSkin && !hasAsset) {
    return null;
  }

  const rootClass = inline
    ? "color-picker-root color-picker-root--inline"
    : "color-picker-root";

  // Single color — skin or no slots
  if (isSkin || categorySlots.length === 0) {
    const activeColor =
      customization[currentCategory?.name]?.color || "#ffffff";
    return (
      <div className={rootClass}>
        <div className="color-picker-scroll">
          <StyledPicker
            color={activeColor}
            onChange={(c) => updateColor(currentCategory.name, c, undefined)}
          />
        </div>
      </div>
    );
  }

  // Multi-slot
  const sortedSlots = [...categorySlots].sort();

  return (
    <div className={rootClass}>
      <div className="color-picker-scroll">
        {sortedSlots.map((slotName, index) => {
          const activeColor =
            customization[currentCategory?.name]?.colors?.[slotName] ||
            customization[currentCategory?.name]?.color ||
            "#ffffff";

          const label = slotName.replace("Color_", "").replace(/_/g, " ");

          return (
            <React.Fragment key={slotName}>
              <div className="slot-picker-container">
                <div className="slot-picker-label">{label}&nbsp;Color</div>
                <StyledPicker
                  color={activeColor}
                  onChange={(c) =>
                    updateColor(currentCategory.name, c, slotName)
                  }
                />
              </div>
              {index < sortedSlots.length - 1 && (
                <div className="color-slot-divider" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ColorPicker;
