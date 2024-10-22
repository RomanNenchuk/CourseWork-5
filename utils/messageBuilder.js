export const buildMsg = (name, text) => ({
  name,
  text,
  time: new Intl.DateTimeFormat("default", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).format(new Date()),
});
