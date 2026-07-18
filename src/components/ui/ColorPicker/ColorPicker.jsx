"use client";
import { motion } from "motion/react";
import { CustomPicker } from "react-color";
import {
  EditableInput,
  Hue,
  Saturation,
} from "react-color/lib/components/common";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

const MotionButton = motion.button;

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
        <div className="no-scrollbar mb-2 flex max-h-[clamp(38px,7vh,68px)] max-w-full flex-wrap gap-1.5 overflow-y-auto p-1">
          {presetColors.map((color) => {
            const isActive =
              activeColor && activeColor === color.toLowerCase?.();
            return (
              <Button
                asChild
                key={color}
                variant="ghost"
                size="icon"
                className={`h-5 w-5 shrink-0 rounded-md transition-shadow ${
                  isActive
                    ? "ring-2 ring-white ring-offset-1 ring-offset-transparent shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                    : "ring-1 ring-black/10 hover:ring-white/40"
                }`}
              >
                <MotionButton
                  type="button"
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => props.onChange(color)}
                  style={{ backgroundColor: color }}
                />
              </Button>
            );
          })}
        </div>
      )}

      <div className="flex min-h-8 items-center rounded-lg bg-white/[0.06] px-2.5 ring-1 ring-white/10">
        <span className="w-9 shrink-0 text-[10px] leading-none font-semibold tracking-widest text-white/50">
          HEX
        </span>
        <EditableInput
          value={props.hex}
          onChange={(data) => props.onChange(data.hex || data)}
          style={{
            wrap: {
              display: "flex",
              flex: "1 1 auto",
              minWidth: 0,
              alignItems: "center",
            },
            input: {
              width: "100%",
              height: "18px",
              display: "block",
              border: "none",
              background: "transparent",
              outline: "none",
              fontWeight: 400,
              fontSize: "12px",
              lineHeight: "18px",
              color: "#ffffff",
              padding: 0,
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

// A labelled swatch that opens the full picker in a popover when clicked.
const ColorSwatch = ({ label, color, onChange }) => (
  <div className="flex shrink-0 items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
    {label && (
      <span className="text-[10px] font-semibold tracking-[0.12em] text-white/65 uppercase">
        {label}
      </span>
    )}
    <Popover>
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          aria-label={`${label || "Color"}: ${color}`}
          className="h-8 w-8 shrink-0 rounded-md ring-1 ring-white/15 ring-offset-1 ring-offset-transparent transition-shadow hover:ring-white/40"
          style={{ backgroundColor: color }}
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="glass-panel w-[clamp(240px,22vw,300px)] rounded-xl border-0 bg-transparent p-4 text-white"
      >
        <StyledPicker color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  </div>
);

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
    ? "flex w-full flex-col divide-y divide-white/[0.08] text-white"
    : cn(
        "glass-panel thin-scrollbar flex w-full shrink-0 flex-col divide-y divide-white/[0.08] overflow-y-auto rounded-xl p-4 text-white",
        "max-h-[clamp(200px,30vh,300px)]",
      );

  // Single color — skin or no slots
  if (isSkin || categorySlots.length === 0) {
    const activeColor =
      customization[currentCategory?.name]?.color || "#ffffff";
    return (
      <div className={containerClass}>
        <ColorSwatch
          label={isSkin ? null : "Color"}
          color={activeColor}
          onChange={(c) => updateColor(currentCategory.name, c, undefined)}
        />
      </div>
    );
  }

  // Multi-slot
  const sortedSlots = [...categorySlots].sort();

  return (
    <div className={containerClass}>
      {sortedSlots.map((slotName) => {
        const activeColor =
          customization[currentCategory?.name]?.colors?.[slotName] ||
          customization[currentCategory?.name]?.color ||
          "#ffffff";

        const label = `${slotName
          .replace("Color_", "")
          .replace(/_/g, " ")} Color`;

        return (
          <ColorSwatch
            key={slotName}
            label={label}
            color={activeColor}
            onChange={(c) => updateColor(currentCategory.name, c, slotName)}
          />
        );
      })}
    </div>
  );
};

export default ColorPicker;
