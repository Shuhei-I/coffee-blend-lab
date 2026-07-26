export const roastLevelOptions = [
  ["", "未設定"],
  ["light", "ライト"],
  ["cinnamon", "シナモン"],
  ["medium", "ミディアム"],
  ["high", "ハイ"],
  ["city", "シティ"],
  ["full-city", "フルシティ"],
  ["french", "フレンチ"],
  ["italian", "イタリアン"],
];

export function getRoastLevelLabel(value) {
  return roastLevelOptions.find(([key]) => key === value)?.[1] || roastLevelOptions[0][1];
}
