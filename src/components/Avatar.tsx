import { parseAvatarKey, generateAvatarUrl, getDefaultAvatarConfig, type AvatarConfig } from "@/lib/avataaars";

/**
 * Avataaars-based Avatar component
 * Uses avataaars.io API for customizable avatars
 */
export function Avatar({ k, size = 48 }: { k: string; size?: number }) {
  let config: AvatarConfig;
  
  try {
    config = parseAvatarKey(k);
  } catch {
    config = getDefaultAvatarConfig();
  }

  // Always use Circle style for consistency
  config.avatarStyle = "Circle";

  const url = generateAvatarUrl(config);

  return (
    <img
      src={url}
      alt="Avatar"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-full"
      loading="lazy"
    />
  );
}

// Export for backward compatibility with old code
export { AVATAR_PRESETS as AVATARS } from "@/lib/avataaars";
