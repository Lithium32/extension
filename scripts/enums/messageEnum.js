export const SizeEnum = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
  properties: {
    small: { name: "SMALL", code: "small" },
    medium: { name: "MEDIUM", code: "medium" },
    large: { name: "LARGE", code: "large" }
  }
};

 mySize = SizeEnum.MEDIUM;
 myCode = SizeEnum.properties[mySize].code; // myCode == "M"
 console.log(myCode);