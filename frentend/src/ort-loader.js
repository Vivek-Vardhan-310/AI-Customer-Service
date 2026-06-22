const ort = typeof window !== 'undefined' ? window.ort : {};

export const env = ort.env;
export const InferenceSession = ort.InferenceSession;
export const Tensor = ort.Tensor;
export const Session = ort.Session;
export const captureExceptions = ort.captureExceptions;

export default ort;
