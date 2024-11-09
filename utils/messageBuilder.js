export const buildMsg = (name, text, iv) => ({
  name,
  text,
  iv,
  time: new Intl.DateTimeFormat("default", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).format(new Date()),
});
