// New Apple and Google accounts have no username yet. Sign-in raises this flag
// and the tabs ask once they're on screen.
let pending = false;

export const askForUsername = () => {
  pending = true;
};

export const takeUsernamePrompt = () => {
  const ask = pending;
  pending = false;
  return ask;
};
