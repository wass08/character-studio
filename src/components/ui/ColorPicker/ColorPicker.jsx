"use client";
import React from "react";
import { motion } from "motion/react";
import { CustomPicker } from "react-color";
import {
  Hue,
  Saturation,
  EditableInput,
} from "react-color/lib/components/common";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { cn } from "../primitives/cn";

const SaturationPointer = () => (
  <div
    style={{
      width: "10px",
      height: "10px",
      borderRadius: "50%",
      boxShadow:
        "rgb(255, 255, 255) 0px 0px 0px 1.5px inset, rgba(0,0,0,0.4) 0 0 4px",
      transform: "translate(-5px, -5px)",
    }}
  />
);

const HuePointer = () => (
  <div
    style={{
      width: "5px",
      height: "14px",
      backgroundColor: "white",
      borderRadius: "2px",
      transform: "translate(-2px, -2px)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
    }}
  />
);

const CustomColorPicker = (props) => {
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory,
  );
  const customization = useConfiguratorStore((state) => state.customization);

  const presetColors = currentCategory?.expand?.colorPalette?.colors || [];
  const activeColor =
    customization[currentCategory?.name]?.color?.toLowerCase?.() || "";

  return (
    <div className="flex w-full shrink-0 flex-col">
      <div
        style={{
          height: "clamp(64px, 11vh, 110px)",
          position: "relative",
          width: "100%",
          marginBottom: "10px",
          borderRadius: "8px",
          overflow: "hidden",
        }}
        className="ring-1 ring-white/10"
      >
        <Saturation {...props} pointer={SaturationPointer} />
      </div>
      <div
        style={{
          height: "10px",
          position: "relative",
          width: "100%",
          marginBottom: "8px",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <Hue {...props} pointer={HuePointer} />
      </div>

      {presetColors.length > 0 && (
        <div className="thin-scrollbar mb-2 flex max-h-[clamp(36px,7vh,64px)] max-w-full flex-wrap gap-1.5 overflow-y-auto">
          {presetColors.map((color) => {
            const isActive =
              activeColor && activeColor === color.toLowerCase?.();
            return (
              <motion.button
                key={color}
                type="button"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => props.onChange(color)}
                style={{ backgroundColor: color }}
                className={`h-5 w-5 shrink-0 rounded-md transition-shadow ${
                  isActive
                    ? "ring-2 ring-white ring-offset-1 ring-offset-transparent shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                    : "ring-1 ring-black/10 hover:ring-white/40"
                }`}
              />
            );
          })}
        </div>
      )}

      <div className="flex items-center rounded-md bg-white/[0.06] px-2.5 py-1 ring-1 ring-white/10">
        <span className="mr-1.5 text-[10px] font-semibold tracking-widest text-white/50">
          HEX
        </span>
        <EditableInput
          value={props.hex}
          onChange={(data) => props.onChange(data.hex || data)}
          style={{
            input: {
              width: "100%",
              border: "none",
              background: "transparent",
              outline: "none",
              fontWeight: 400,
              fontSize: "12px",
              color: "#ffffff",
              padding: "2px 0",
              fontFamily: "inherit",
            },
            label: { display: "none" },
          }}
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

  const containerClass = inline
    ? "flex w-full flex-col text-white"
    : cn(
        "glass-panel thin-scrollbar flex w-full shrink-0 flex-col overflow-hidden rounded-xl p-4 text-white",
        "max-h-[clamp(200px,30vh,300px)]",
      );

  const scrollClass = inline
    ? "flex flex-col gap-3"
    : "thin-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1";

  // Single color — skin or no slots
  if (isSkin || categorySlots.length === 0) {
    const activeColor =
      customization[currentCategory?.name]?.color || "#ffffff";
    return (
      <div className={containerClass}>
        <div className={scrollClass}>
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
    <div className={containerClass}>
      <div className={scrollClass}>
        {sortedSlots.map((slotName, index) => {
          const activeColor =
            customization[currentCategory?.name]?.colors?.[slotName] ||
            customization[currentCategory?.name]?.color ||
            "#ffffff";

          const label = slotName.replace("Color_", "").replace(/_/g, " ");

          return (
            <React.Fragment key={slotName}>
              <div className="flex shrink-0 flex-col">
                <div className="mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-white/65 uppercase">
                  {label} Color
                </div>
                <StyledPicker
                  color={activeColor}
                  onChange={(c) =>
                    updateColor(currentCategory.name, c, slotName)
                  }
                />
              </div>
              {index < sortedSlots.length - 1 && (
                <div className="h-px w-full shrink-0 bg-white/10" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ColorPicker;
