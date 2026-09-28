/**
 * Avataaars Configuration Types and URL Generator
 * Uses avataaars.io API to generate customizable avatars
 */

export type AvatarStyle = "Circle" | "Transparent";

export type TopType =
  | "NoHair"
  | "Eyepatch"
  | "Hat"
  | "Hijab"
  | "Turban"
  | "WinterHat1"
  | "WinterHat2"
  | "WinterHat3"
  | "WinterHat4"
  | "LongHairBigHair"
  | "LongHairBob"
  | "LongHairBun"
  | "LongHairCurly"
  | "LongHairCurvy"
  | "LongHairDreads"
  | "LongHairFrida"
  | "LongHairFro"
  | "LongHairFroBand"
  | "LongHairNotTooLong"
  | "LongHairShavedSides"
  | "LongHairMiaWallace"
  | "LongHairStraight"
  | "LongHairStraight2"
  | "LongHairStraightStrand"
  | "ShortHairDreads01"
  | "ShortHairDreads02"
  | "ShortHairFrizzle"
  | "ShortHairShaggyMullet"
  | "ShortHairShortCurly"
  | "ShortHairShortFlat"
  | "ShortHairShortRound"
  | "ShortHairShortWaved"
  | "ShortHairSides"
  | "ShortHairTheCaesar"
  | "ShortHairTheCaesarSidePart";

export type AccessoriesType =
  | "Blank"
  | "Kurt"
  | "Prescription01"
  | "Prescription02"
  | "Round"
  | "Sunglasses"
  | "Wayfarers";

export type HairColor =
  | "Auburn"
  | "Black"
  | "Blonde"
  | "BlondeGolden"
  | "Brown"
  | "BrownDark"
  | "PastelPink"
  | "Blue"
  | "Platinum"
  | "Red"
  | "SilverGray";

export type FacialHairType =
  | "Blank"
  | "BeardMedium"
  | "BeardLight"
  | "BeardMagestic"
  | "MoustacheFancy"
  | "MoustacheMagnum";

export type ClotheType =
  | "BlazerShirt"
  | "BlazerSweater"
  | "CollarSweater"
  | "GraphicShirt"
  | "Hoodie"
  | "Overall"
  | "ShirtCrewNeck"
  | "ShirtScoopNeck"
  | "ShirtVNeck";

export type ClotheColor =
  | "Black"
  | "Blue01"
  | "Blue02"
  | "Blue03"
  | "Gray01"
  | "Gray02"
  | "Heather"
  | "PastelBlue"
  | "PastelGreen"
  | "PastelOrange"
  | "PastelRed"
  | "PastelYellow"
  | "Pink"
  | "Red"
  | "White";

export type EyeType =
  | "Close"
  | "Cry"
  | "Default"
  | "Dizzy"
  | "EyeRoll"
  | "Happy"
  | "Hearts"
  | "Side"
  | "Squint"
  | "Surprised"
  | "Wink"
  | "WinkWacky";

export type EyebrowType =
  | "Angry"
  | "AngryNatural"
  | "Default"
  | "DefaultNatural"
  | "FlatNatural"
  | "RaisedExcited"
  | "RaisedExcitedNatural"
  | "SadConcerned"
  | "SadConcernedNatural"
  | "UnibrowNatural"
  | "UpDown"
  | "UpDownNatural";

export type MouthType =
  | "Concerned"
  | "Default"
  | "Disbelief"
  | "Eating"
  | "Grimace"
  | "Sad"
  | "ScreamOpen"
  | "Serious"
  | "Smile"
  | "Tongue"
  | "Twinkle"
  | "Vomit";

export type SkinColor =
  | "Tanned"
  | "Yellow"
  | "Pale"
  | "Light"
  | "Brown"
  | "DarkBrown"
  | "Black";

export interface AvatarConfig {
  avatarStyle?: AvatarStyle;
  topType?: TopType;
  accessoriesType?: AccessoriesType;
  hairColor?: HairColor;
  facialHairType?: FacialHairType;
  clotheType?: ClotheType;
  clotheColor?: ClotheColor;
  eyeType?: EyeType;
  eyebrowType?: EyebrowType;
  mouthType?: MouthType;
  skinColor?: SkinColor;
}

/**
 * Generate Avataaars URL from configuration
 */
export function generateAvatarUrl(config: AvatarConfig): string {
  const baseUrl = "https://avataaars.io/";
  const params = new URLSearchParams();

  if (config.avatarStyle) params.set("avatarStyle", config.avatarStyle);
  if (config.topType) params.set("topType", config.topType);
  if (config.accessoriesType) params.set("accessoriesType", config.accessoriesType);
  if (config.hairColor) params.set("hairColor", config.hairColor);
  if (config.facialHairType) params.set("facialHairType", config.facialHairType);
  if (config.clotheType) params.set("clotheType", config.clotheType);
  if (config.clotheColor) params.set("clotheColor", config.clotheColor);
  if (config.eyeType) params.set("eyeType", config.eyeType);
  if (config.eyebrowType) params.set("eyebrowType", config.eyebrowType);
  if (config.mouthType) params.set("mouthType", config.mouthType);
  if (config.skinColor) params.set("skinColor", config.skinColor);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parse avatar config from string (stored in DB)
 */
export function parseAvatarKey(key: string): AvatarConfig {
  try {
    return JSON.parse(key);
  } catch {
    // Fallback to default if parsing fails
    return getDefaultAvatarConfig();
  }
}

/**
 * Stringify avatar config for DB storage
 */
export function stringifyAvatarConfig(config: AvatarConfig): string {
  return JSON.stringify(config);
}

/**
 * Get default avatar configuration
 */
export function getDefaultAvatarConfig(): AvatarConfig {
  return {
    avatarStyle: "Circle",
    topType: "ShortHairShortFlat",
    accessoriesType: "Blank",
    hairColor: "Brown",
    facialHairType: "Blank",
    clotheType: "Hoodie",
    clotheColor: "Blue03",
    eyeType: "Default",
    eyebrowType: "Default",
    mouthType: "Smile",
    skinColor: "Light",
  };
}

/**
 * Predefined avatar presets for quick selection
 * 30 for males, 30 for females
 */
export const AVATAR_PRESETS = {
  male: [
    { topType: "ShortHairShortFlat", hairColor: "Brown", facialHairType: "Blank", clotheType: "Hoodie", clotheColor: "Blue03", skinColor: "Light", eyeType: "Default", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "ShortHairTheCaesar", hairColor: "Black", facialHairType: "BeardLight", clotheType: "BlazerShirt", clotheColor: "Gray01", skinColor: "Tanned", eyeType: "Happy", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "ShortHairShortWaved", hairColor: "BlondeGolden", facialHairType: "Blank", clotheType: "ShirtCrewNeck", clotheColor: "White", skinColor: "Pale", eyeType: "Default", eyebrowType: "RaisedExcited", mouthType: "Default" },
    { topType: "ShortHairSides", hairColor: "BrownDark", facialHairType: "BeardMedium", clotheType: "CollarSweater", clotheColor: "Heather", skinColor: "Brown", eyeType: "Squint", eyebrowType: "Default", mouthType: "Serious" },
    { topType: "ShortHairDreads01", hairColor: "Black", facialHairType: "Blank", clotheType: "Hoodie", clotheColor: "Red", skinColor: "DarkBrown", eyeType: "Happy", eyebrowType: "Default", mouthType: "Twinkle" },
    { topType: "ShortHairFrizzle", hairColor: "Red", facialHairType: "MoustacheFancy", clotheType: "GraphicShirt", clotheColor: "Blue02", skinColor: "Light", eyeType: "Wink", eyebrowType: "DefaultNatural", mouthType: "Smile" },
    { topType: "ShortHairShortCurly", hairColor: "Auburn", facialHairType: "Blank", clotheType: "ShirtVNeck", clotheColor: "Black", skinColor: "Tanned", eyeType: "Default", eyebrowType: "Default", mouthType: "Default" },
    { topType: "ShortHairShortRound", hairColor: "Blonde", facialHairType: "BeardLight", clotheType: "BlazerSweater", clotheColor: "Gray02", skinColor: "Pale", eyeType: "Side", eyebrowType: "FlatNatural", mouthType: "Serious" },
    { topType: "ShortHairShaggyMullet", hairColor: "BrownDark", facialHairType: "Blank", clotheType: "Overall", clotheColor: "Blue01", skinColor: "Light", eyeType: "Surprised", eyebrowType: "RaisedExcited", mouthType: "Disbelief" },
    { topType: "ShortHairTheCaesarSidePart", hairColor: "Black", facialHairType: "BeardMagestic", clotheType: "Hoodie", clotheColor: "PastelBlue", skinColor: "Brown", eyeType: "Default", eyebrowType: "Angry", mouthType: "Default" },
    { topType: "NoHair", hairColor: "Black", facialHairType: "BeardMedium", clotheType: "BlazerShirt", clotheColor: "Black", skinColor: "DarkBrown", eyeType: "Default", eyebrowType: "Default", mouthType: "Serious" },
    { topType: "Hat", hairColor: "Brown", facialHairType: "Blank", clotheType: "ShirtCrewNeck", clotheColor: "Red", skinColor: "Tanned", eyeType: "Happy", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "Turban", hairColor: "Black", facialHairType: "BeardLight", clotheType: "CollarSweater", clotheColor: "Heather", skinColor: "Brown", eyeType: "Default", eyebrowType: "Default", mouthType: "Default" },
    { topType: "WinterHat1", hairColor: "BlondeGolden", facialHairType: "Blank", clotheType: "Hoodie", clotheColor: "PastelRed", skinColor: "Light", eyeType: "Squint", eyebrowType: "Default", mouthType: "Twinkle" },
    { topType: "ShortHairDreads02", hairColor: "Black", facialHairType: "Blank", clotheType: "GraphicShirt", clotheColor: "Blue03", skinColor: "DarkBrown", eyeType: "Default", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "ShortHairShortFlat", hairColor: "SilverGray", facialHairType: "MoustacheMagnum", clotheType: "BlazerShirt", clotheColor: "Gray01", skinColor: "Pale", eyeType: "Default", eyebrowType: "AngryNatural", mouthType: "Serious" },
    { topType: "ShortHairTheCaesar", hairColor: "Red", facialHairType: "Blank", clotheType: "ShirtVNeck", clotheColor: "White", skinColor: "Tanned", eyeType: "Wink", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "ShortHairSides", hairColor: "Auburn", facialHairType: "BeardLight", clotheType: "Overall", clotheColor: "Blue02", skinColor: "Light", eyeType: "Default", eyebrowType: "Default", mouthType: "Default" },
    { topType: "ShortHairShortWaved", hairColor: "Blonde", facialHairType: "Blank", clotheType: "Hoodie", clotheColor: "Black", skinColor: "Pale", eyeType: "Happy", eyebrowType: "RaisedExcited", mouthType: "Twinkle" },
    { topType: "ShortHairFrizzle", hairColor: "Brown", facialHairType: "BeardMedium", clotheType: "CollarSweater", clotheColor: "Gray02", skinColor: "Brown", eyeType: "Default", eyebrowType: "Default", mouthType: "Serious" },
    { topType: "Eyepatch", hairColor: "Black", facialHairType: "Blank", clotheType: "GraphicShirt", clotheColor: "Red", skinColor: "Tanned", eyeType: "Default", eyebrowType: "Angry", mouthType: "Grimace" },
    { topType: "WinterHat2", hairColor: "BrownDark", facialHairType: "Blank", clotheType: "Hoodie", clotheColor: "PastelGreen", skinColor: "Light", eyeType: "Side", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "WinterHat3", hairColor: "BlondeGolden", facialHairType: "BeardLight", clotheType: "BlazerSweater", clotheColor: "Blue01", skinColor: "Pale", eyeType: "Default", eyebrowType: "FlatNatural", mouthType: "Default" },
    { topType: "WinterHat4", hairColor: "Black", facialHairType: "Blank", clotheType: "ShirtCrewNeck", clotheColor: "Heather", skinColor: "DarkBrown", eyeType: "Happy", eyebrowType: "Default", mouthType: "Twinkle" },
    { topType: "ShortHairShortCurly", hairColor: "Red", facialHairType: "MoustacheFancy", clotheType: "Overall", clotheColor: "Blue03", skinColor: "Brown", eyeType: "Default", eyebrowType: "DefaultNatural", mouthType: "Smile" },
    { topType: "ShortHairShortRound", hairColor: "Auburn", facialHairType: "Blank", clotheType: "Hoodie", clotheColor: "Pink", skinColor: "Tanned", eyeType: "Wink", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "ShortHairShaggyMullet", hairColor: "Blonde", facialHairType: "BeardMagestic", clotheType: "BlazerShirt", clotheColor: "Black", skinColor: "Light", eyeType: "Default", eyebrowType: "Angry", mouthType: "Serious" },
    { topType: "ShortHairTheCaesarSidePart", hairColor: "SilverGray", facialHairType: "BeardMedium", clotheType: "CollarSweater", clotheColor: "Gray01", skinColor: "Pale", eyeType: "Default", eyebrowType: "Default", mouthType: "Default" },
    { topType: "NoHair", hairColor: "Black", facialHairType: "BeardLight", clotheType: "GraphicShirt", clotheColor: "White", skinColor: "Brown", eyeType: "Squint", eyebrowType: "SadConcerned", mouthType: "Concerned" },
    { topType: "Hat", hairColor: "Brown", facialHairType: "Blank", clotheType: "ShirtVNeck", clotheColor: "Red", skinColor: "DarkBrown", eyeType: "Happy", eyebrowType: "RaisedExcitedNatural", mouthType: "Smile" },
  ],
  female: [
    { topType: "LongHairStraight", hairColor: "Brown", accessoriesType: "Blank", clotheType: "Hoodie", clotheColor: "Blue03", skinColor: "Light", eyeType: "Default", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "LongHairBigHair", hairColor: "Black", accessoriesType: "Prescription01", clotheType: "BlazerShirt", clotheColor: "Gray01", skinColor: "Tanned", eyeType: "Happy", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "LongHairBob", hairColor: "Blonde", accessoriesType: "Blank", clotheType: "ShirtCrewNeck", clotheColor: "White", skinColor: "Pale", eyeType: "Default", eyebrowType: "RaisedExcited", mouthType: "Default" },
    { topType: "LongHairBun", hairColor: "BrownDark", accessoriesType: "Round", clotheType: "CollarSweater", clotheColor: "Heather", skinColor: "Brown", eyeType: "Side", eyebrowType: "Default", mouthType: "Serious" },
    { topType: "LongHairCurly", hairColor: "Auburn", accessoriesType: "Blank", clotheType: "Hoodie", clotheColor: "Red", skinColor: "DarkBrown", eyeType: "Happy", eyebrowType: "Default", mouthType: "Twinkle" },
    { topType: "LongHairCurvy", hairColor: "PastelPink", accessoriesType: "Kurt", clotheType: "GraphicShirt", clotheColor: "Pink", skinColor: "Light", eyeType: "Hearts", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "LongHairDreads", hairColor: "Black", accessoriesType: "Blank", clotheType: "ShirtVNeck", clotheColor: "Black", skinColor: "DarkBrown", eyeType: "Default", eyebrowType: "Default", mouthType: "Default" },
    { topType: "LongHairFrida", hairColor: "Black", accessoriesType: "Sunglasses", clotheType: "BlazerSweater", clotheColor: "Red", skinColor: "Tanned", eyeType: "Default", eyebrowType: "UnibrowNatural", mouthType: "Smile" },
    { topType: "LongHairFro", hairColor: "Black", accessoriesType: "Blank", clotheType: "Overall", clotheColor: "Blue01", skinColor: "Brown", eyeType: "Surprised", eyebrowType: "RaisedExcited", mouthType: "Disbelief" },
    { topType: "LongHairFroBand", hairColor: "Auburn", accessoriesType: "Wayfarers", clotheType: "Hoodie", clotheColor: "PastelBlue", skinColor: "Light", eyeType: "Default", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "LongHairNotTooLong", hairColor: "Blonde", accessoriesType: "Blank", clotheType: "BlazerShirt", clotheColor: "Gray02", skinColor: "Pale", eyeType: "Wink", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "LongHairShavedSides", hairColor: "Red", accessoriesType: "Blank", clotheType: "ShirtCrewNeck", clotheColor: "Black", skinColor: "Tanned", eyeType: "Default", eyebrowType: "Angry", mouthType: "Grimace" },
    { topType: "LongHairMiaWallace", hairColor: "Black", accessoriesType: "Blank", clotheType: "CollarSweater", clotheColor: "White", skinColor: "Light", eyeType: "Default", eyebrowType: "Default", mouthType: "Serious" },
    { topType: "LongHairStraight2", hairColor: "BlondeGolden", accessoriesType: "Prescription02", clotheType: "Hoodie", clotheColor: "PastelRed", skinColor: "Pale", eyeType: "Side", eyebrowType: "FlatNatural", mouthType: "Default" },
    { topType: "LongHairStraightStrand", hairColor: "Brown", accessoriesType: "Blank", clotheType: "GraphicShirt", clotheColor: "Blue03", skinColor: "Brown", eyeType: "Happy", eyebrowType: "Default", mouthType: "Twinkle" },
    { topType: "Hijab", hairColor: "Black", accessoriesType: "Blank", clotheType: "BlazerShirt", clotheColor: "Heather", skinColor: "Tanned", eyeType: "Default", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "WinterHat1", hairColor: "BrownDark", accessoriesType: "Blank", clotheType: "Hoodie", clotheColor: "PastelGreen", skinColor: "Light", eyeType: "Default", eyebrowType: "Default", mouthType: "Default" },
    { topType: "WinterHat2", hairColor: "Auburn", accessoriesType: "Round", clotheType: "Overall", clotheColor: "Blue02", skinColor: "Pale", eyeType: "Happy", eyebrowType: "RaisedExcited", mouthType: "Smile" },
    { topType: "WinterHat3", hairColor: "Blonde", accessoriesType: "Blank", clotheType: "CollarSweater", clotheColor: "Gray01", skinColor: "Brown", eyeType: "Default", eyebrowType: "Default", mouthType: "Serious" },
    { topType: "WinterHat4", hairColor: "PastelPink", accessoriesType: "Sunglasses", clotheType: "ShirtVNeck", clotheColor: "Pink", skinColor: "Light", eyeType: "Default", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "LongHairBigHair", hairColor: "Red", accessoriesType: "Blank", clotheType: "Hoodie", clotheColor: "Black", skinColor: "Tanned", eyeType: "Squint", eyebrowType: "SadConcerned", mouthType: "Concerned" },
    { topType: "LongHairBob", hairColor: "Black", accessoriesType: "Prescription01", clotheType: "BlazerSweater", clotheColor: "Blue01", skinColor: "DarkBrown", eyeType: "Default", eyebrowType: "Default", mouthType: "Default" },
    { topType: "LongHairBun", hairColor: "SilverGray", accessoriesType: "Blank", clotheType: "GraphicShirt", clotheColor: "White", skinColor: "Pale", eyeType: "Default", eyebrowType: "DefaultNatural", mouthType: "Smile" },
    { topType: "LongHairCurly", hairColor: "BlondeGolden", accessoriesType: "Kurt", clotheType: "ShirtCrewNeck", clotheColor: "Red", skinColor: "Light", eyeType: "Wink", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "LongHairCurvy", hairColor: "Auburn", accessoriesType: "Blank", clotheType: "Overall", clotheColor: "Gray02", skinColor: "Brown", eyeType: "Default", eyebrowType: "FlatNatural", mouthType: "Default" },
    { topType: "LongHairDreads", hairColor: "Black", accessoriesType: "Wayfarers", clotheType: "Hoodie", clotheColor: "Blue03", skinColor: "DarkBrown", eyeType: "Happy", eyebrowType: "Default", mouthType: "Twinkle" },
    { topType: "LongHairFrida", hairColor: "Black", accessoriesType: "Blank", clotheType: "CollarSweater", clotheColor: "Heather", skinColor: "Tanned", eyeType: "Default", eyebrowType: "UnibrowNatural", mouthType: "Serious" },
    { topType: "LongHairFro", hairColor: "Auburn", accessoriesType: "Blank", clotheType: "BlazerShirt", clotheColor: "Black", skinColor: "Brown", eyeType: "Side", eyebrowType: "RaisedExcited", mouthType: "Disbelief" },
    { topType: "LongHairFroBand", hairColor: "PastelPink", accessoriesType: "Round", clotheType: "GraphicShirt", clotheColor: "Pink", skinColor: "Light", eyeType: "Hearts", eyebrowType: "Default", mouthType: "Smile" },
    { topType: "LongHairNotTooLong", hairColor: "Blonde", accessoriesType: "Blank", clotheType: "ShirtVNeck", clotheColor: "White", skinColor: "Pale", eyeType: "Default", eyebrowType: "Default", mouthType: "Default" },
  ],
} as const;
