"use client";
import { useState } from "react";
import { Avatar } from "./Avatar";
import {
  stringifyAvatarConfig,
  type AvatarConfig,
  type TopType,
  type HairColor,
  type FacialHairType,
  type AccessoriesType,
  type ClotheType,
  type ClotheColor,
  type EyeType,
  type EyebrowType,
  type MouthType,
  type SkinColor,
} from "@/lib/avataaars";

interface AvatarBuilderProps {
  initialConfig: AvatarConfig;
  gender: "male" | "female";
  onSave: (avatarKey: string) => void;
  onCancel: () => void;
  saving?: boolean;
  error?: string;
}

export function AvatarBuilder({
  initialConfig,
  gender,
  onSave,
  onCancel,
  saving = false,
  error,
}: AvatarBuilderProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);

  const handleSave = () => {
    const avatarKey = stringifyAvatarConfig(config);
    onSave(avatarKey);
  };

  // Hair options for males and females
  const maleHairOptions: TopType[] = [
    "NoHair",
    "ShortHairShortFlat",
    "ShortHairShortWaved",
    "ShortHairTheCaesar",
    "ShortHairSides",
    "ShortHairDreads01",
    "ShortHairDreads02",
    "ShortHairFrizzle",
    "ShortHairShaggyMullet",
    "ShortHairShortCurly",
    "ShortHairShortRound",
    "ShortHairTheCaesarSidePart",
    "Hat",
    "Turban",
    "WinterHat1",
    "WinterHat2",
    "WinterHat3",
    "WinterHat4",
    "Eyepatch",
  ];

  const femaleHairOptions: TopType[] = [
    "LongHairStraight",
    "LongHairBigHair",
    "LongHairBob",
    "LongHairBun",
    "LongHairCurly",
    "LongHairCurvy",
    "LongHairDreads",
    "LongHairFrida",
    "LongHairFro",
    "LongHairFroBand",
    "LongHairNotTooLong",
    "LongHairShavedSides",
    "LongHairMiaWallace",
    "LongHairStraight2",
    "LongHairStraightStrand",
    "Hijab",
    "WinterHat1",
    "WinterHat2",
    "WinterHat3",
    "WinterHat4",
    "NoHair",
  ];

  const hairOptions = gender === "male" ? maleHairOptions : femaleHairOptions;

  const hairColorOptions: HairColor[] = [
    "Black",
    "Brown",
    "BrownDark",
    "Auburn",
    "Blonde",
    "BlondeGolden",
    "Red",
    "PastelPink",
    "Blue",
    "Platinum",
    "SilverGray",
  ];

  const facialHairOptions: FacialHairType[] = [
    "Blank",
    "BeardLight",
    "BeardMedium",
    "BeardMagestic",
    "MoustacheFancy",
    "MoustacheMagnum",
  ];

  const accessoriesOptions: AccessoriesType[] = [
    "Blank",
    "Kurt",
    "Prescription01",
    "Prescription02",
    "Round",
    "Sunglasses",
    "Wayfarers",
  ];

  const clotheOptions: ClotheType[] = [
    "BlazerShirt",
    "BlazerSweater",
    "CollarSweater",
    "GraphicShirt",
    "Hoodie",
    "Overall",
    "ShirtCrewNeck",
    "ShirtScoopNeck",
    "ShirtVNeck",
  ];

  const clotheColorOptions: ClotheColor[] = [
    "Black",
    "Blue01",
    "Blue02",
    "Blue03",
    "Gray01",
    "Gray02",
    "Heather",
    "PastelBlue",
    "PastelGreen",
    "PastelOrange",
    "PastelRed",
    "PastelYellow",
    "Pink",
    "Red",
    "White",
  ];

  const eyeOptions: EyeType[] = [
    "Default",
    "Close",
    "Cry",
    "Dizzy",
    "EyeRoll",
    "Happy",
    "Hearts",
    "Side",
    "Squint",
    "Surprised",
    "Wink",
    "WinkWacky",
  ];

  const eyebrowOptions: EyebrowType[] = [
    "Default",
    "Angry",
    "AngryNatural",
    "DefaultNatural",
    "FlatNatural",
    "RaisedExcited",
    "RaisedExcitedNatural",
    "SadConcerned",
    "SadConcernedNatural",
    "UnibrowNatural",
    "UpDown",
    "UpDownNatural",
  ];

  const mouthOptions: MouthType[] = [
    "Smile",
    "Default",
    "Concerned",
    "Disbelief",
    "Eating",
    "Grimace",
    "Sad",
    "ScreamOpen",
    "Serious",
    "Tongue",
    "Twinkle",
    "Vomit",
  ];

  const skinColorOptions: SkinColor[] = [
    "Tanned",
    "Yellow",
    "Pale",
    "Light",
    "Brown",
    "DarkBrown",
    "Black",
  ];

  // Helper to format option names for display
  const formatLabel = (value: string) => {
    return value.replace(/([A-Z])/g, " $1").trim();
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex justify-center">
        <Avatar k={stringifyAvatarConfig(config)} size={128} />
      </div>

      {/* Controls */}
      <div className="max-h-96 overflow-y-auto space-y-4 px-1">
        {/* Hair */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {gender === "male" ? "الشعر / القبعة" : "الشعر / الحجاب"}
          </label>
          <select
            value={config.topType || ""}
            onChange={(e) => setConfig({ ...config, topType: e.target.value as TopType })}
            className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
          >
            {hairOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Hair Color */}
        {config.topType !== "NoHair" && config.topType !== "Hijab" && config.topType !== "Turban" && (
          <div>
            <label className="block text-sm font-medium mb-2">لون الشعر</label>
            <select
              value={config.hairColor || ""}
              onChange={(e) => setConfig({ ...config, hairColor: e.target.value as HairColor })}
              className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
            >
              {hairColorOptions.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Facial Hair (males only) */}
        {gender === "male" && (
          <div>
            <label className="block text-sm font-medium mb-2">اللحية / الشارب</label>
            <select
              value={config.facialHairType || ""}
              onChange={(e) => setConfig({ ...config, facialHairType: e.target.value as FacialHairType })}
              className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
            >
              {facialHairOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "Blank" ? "بدون" : formatLabel(option)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Accessories */}
        <div>
          <label className="block text-sm font-medium mb-2">النظارة / الإكسسوارات</label>
          <select
            value={config.accessoriesType || ""}
            onChange={(e) => setConfig({ ...config, accessoriesType: e.target.value as AccessoriesType })}
            className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
          >
            {accessoriesOptions.map((option) => (
              <option key={option} value={option}>
                {option === "Blank" ? "بدون" : formatLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Eyes */}
        <div>
          <label className="block text-sm font-medium mb-2">العيون</label>
          <select
            value={config.eyeType || ""}
            onChange={(e) => setConfig({ ...config, eyeType: e.target.value as EyeType })}
            className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
          >
            {eyeOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Eyebrows */}
        <div>
          <label className="block text-sm font-medium mb-2">الحواجب</label>
          <select
            value={config.eyebrowType || ""}
            onChange={(e) => setConfig({ ...config, eyebrowType: e.target.value as EyebrowType })}
            className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
          >
            {eyebrowOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Mouth */}
        <div>
          <label className="block text-sm font-medium mb-2">الفم</label>
          <select
            value={config.mouthType || ""}
            onChange={(e) => setConfig({ ...config, mouthType: e.target.value as MouthType })}
            className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
          >
            {mouthOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Skin Color */}
        <div>
          <label className="block text-sm font-medium mb-2">لون البشرة</label>
          <select
            value={config.skinColor || ""}
            onChange={(e) => setConfig({ ...config, skinColor: e.target.value as SkinColor })}
            className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
          >
            {skinColorOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Clothes */}
        <div>
          <label className="block text-sm font-medium mb-2">الملابس</label>
          <select
            value={config.clotheType || ""}
            onChange={(e) => setConfig({ ...config, clotheType: e.target.value as ClotheType })}
            className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
          >
            {clotheOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Clothes Color */}
        <div>
          <label className="block text-sm font-medium mb-2">لون الملابس</label>
          <select
            value={config.clotheColor || ""}
            onChange={(e) => setConfig({ ...config, clotheColor: e.target.value as ClotheColor })}
            className="w-full min-h-11 rounded-xl border border-line bg-background px-4"
          >
            {clotheColorOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 min-h-11 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
        >
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
        <button onClick={onCancel} className="flex-1 min-h-11 rounded-xl border border-line font-semibold">
          إلغاء
        </button>
      </div>
    </div>
  );
}
