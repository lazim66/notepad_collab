const COLORS = [
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#45B7D1', // blue
  '#FFA07A', // salmon
  '#98D8C8', // mint
  '#F7B731', // yellow
  '#5F27CD', // purple
  '#00D2D3', // cyan
  '#FF9FF3', // pink
  '#54A0FF', // light blue
];

const ADJECTIVES = [
  'Quick', 'Bright', 'Swift', 'Bold', 'Clever',
  'Wise', 'Brave', 'Kind', 'Calm', 'Happy',
  'Eager', 'Jolly', 'Lively', 'Gentle', 'Proud',
];

const ANIMALS = [
  'Panda', 'Fox', 'Tiger', 'Eagle', 'Dolphin',
  'Falcon', 'Owl', 'Bear', 'Wolf', 'Lion',
  'Koala', 'Rabbit', 'Hawk', 'Swan', 'Otter',
];

export interface UserIdentity {
  name: string;
  color: string;
  clientId: string;
}

function generateRandomName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adjective} ${animal}`;
}

function generateRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getOrCreateUserIdentity(): UserIdentity {
  const STORAGE_KEY = 'collab-user-identity';


  const stored = sessionStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const identity = JSON.parse(stored) as UserIdentity;
      if (identity.name && identity.color && identity.clientId) {
        return identity;
      }
    } catch {
      // Invalid stored data, create new identity
    }
  }

  const identity: UserIdentity = {
    name: generateRandomName(),
    color: generateRandomColor(),
    clientId: generateClientId(),
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));

  return identity;
}
