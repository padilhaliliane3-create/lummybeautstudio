import logoAsset from "@/assets/lummy-logo.png.asset.json";

type LogoProps = {
  className?: string;
  size?: number;
};

export function Logo({ className, size = 56 }: LogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="LUMMY Beauty Studio"
      width={size}
      height={size}
      className={className}
      style={{ height: size, width: "auto" }}
    />
  );
}
