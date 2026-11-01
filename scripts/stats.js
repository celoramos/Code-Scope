// Números públicos do projeto, sem telemetria: o Code Scope não envia nada. Roda com: npm run stats
const repo = 'celoramos/Code-Scope';

async function marketplace() {
  const res = await fetch('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json;api-version=7.1-preview.1' },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: 'code-scope.code-scope' }] }], flags: 256 }),
  });
  const extension = (await res.json()).results[0].extensions[0];
  return Object.fromEntries((extension?.statistics ?? []).map((s) => [s.statisticName, s.value]));
}

async function github() {
  const repository = await (await fetch(`https://api.github.com/repos/${repo}`)).json();
  const releases = await (await fetch(`https://api.github.com/repos/${repo}/releases`)).json();
  const downloads = releases.flatMap((r) => r.assets.map((a) => a.download_count)).reduce((a, b) => a + b, 0);
  return { stars: repository.stargazers_count, forks: repository.forks_count, issues: repository.open_issues_count, releaseDownloads: downloads };
}

async function main() {
  const [m, g] = await Promise.all([marketplace(), github()]);
  console.log(`Marketplace: ${m.install ?? 0} instalações, ${m.downloadCount ?? 0} downloads`);
  console.log(`GitHub: ${g.stars} estrelas, ${g.forks} forks, ${g.issues} issues abertas, ${g.releaseDownloads} downloads de releases`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
