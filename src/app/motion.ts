import { repo } from '../data/repo';

export type Motion = 'auto' | 'reduced';

function apply(motion: Motion): void {
  if (motion === 'reduced') document.documentElement.dataset.motion = 'reduced';
  else delete document.documentElement.dataset.motion;
}

export async function loadMotion(): Promise<Motion> {
  const motion = await repo.getSetting<Motion>('motion', 'auto');
  apply(motion);
  return motion;
}

export async function setMotion(motion: Motion): Promise<void> {
  apply(motion);
  await repo.setSetting('motion', motion);
}
