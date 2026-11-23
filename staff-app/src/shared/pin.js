// PIN rules, shared by the server and the forms.

export const isPinFormat = (pin) => /^\d{4,8}$/.test(pin);

/** True for PINs like 1111, 1234 or 9876. */
export const isWeakPin = (pin) =>
  /^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin);
