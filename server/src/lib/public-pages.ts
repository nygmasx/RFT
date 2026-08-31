const styles = `
  :root { color-scheme: dark; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #090909; color: #f4efe7; }
  main { width: min(720px, calc(100% - 40px)); margin: 0 auto; padding: 72px 0; }
  .eyebrow { color: #c8362d; font: 700 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .18em; text-transform: uppercase; }
  h1 { margin: 12px 0 18px; font-size: clamp(40px, 9vw, 72px); line-height: .96; letter-spacing: -.045em; }
  p { color: #b7afa6; font-size: 17px; line-height: 1.7; }
  .card { margin-top: 36px; padding: 24px; border: 1px solid #35312e; border-radius: 20px; background: #151311; }
  .card h2 { margin: 0 0 8px; font-size: 21px; }
  .legal { margin-top: 36px; }
  .legal section { padding: 24px 0; border-top: 1px solid #35312e; }
  .legal h2 { margin: 0 0 8px; font-size: 21px; }
  .updated { color: #77706a; font: 600 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; }
  a { color: #f4efe7; text-decoration-color: #c8362d; text-underline-offset: 4px; }
  footer { margin-top: 52px; color: #77706a; font: 600 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; }
`;

export const supportPage = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Assistance RFT</title>
    <style>${styles}</style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Ronin Fight Team · Montataire</div>
      <h1>Assistance RFT</h1>
      <p>RFT est l’application des membres de Ronin Fight Team. Pour toute question sur votre compte, votre inscription ou le fonctionnement de l’application, contactez directement le club.</p>
      <section class="card">
        <h2>Nous contacter</h2>
        <p><a href="mailto:contact@roninbjj.fr">contact@roninbjj.fr</a></p>
      </section>
      <section class="card">
        <h2>Gérer son compte</h2>
        <p>Les réglages de l’application permettent de modifier vos informations, signaler un problème, quitter le club ou supprimer définitivement votre compte.</p>
      </section>
      <footer>Ronin Fight Team · RFT · <a href="/privacy">Confidentialité</a></footer>
    </main>
  </body>
</html>`;

export const privacyPage = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Politique de confidentialité RFT</title>
    <style>${styles}</style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Ronin Fight Team · Montataire</div>
      <h1>Politique de confidentialité</h1>
      <p class="updated">Mise à jour · 31 août 2026</p>
      <div class="legal">
        <section>
          <h2>Responsable</h2>
          <p>Ronin Fight Team est responsable du traitement des données utilisées par l’application RFT. Toute demande peut être envoyée à <a href="mailto:contact@roninbjj.fr">contact@roninbjj.fr</a>.</p>
        </section>
        <section>
          <h2>Données traitées</h2>
          <p>L’application traite les informations du profil et du compte, les messages et médias publiés, les inscriptions, grades, résultats sportifs, covoiturages, préférences et identifiants techniques nécessaires aux notifications.</p>
        </section>
        <section>
          <h2>Finalités</h2>
          <p>Ces données servent exclusivement à gérer les membres, organiser les activités du club, permettre les échanges internes, proposer les fonctionnalités de covoiturage et envoyer les notifications demandées. Elles ne sont pas utilisées à des fins de suivi publicitaire.</p>
        </section>
        <section>
          <h2>Accès et visibilité</h2>
          <p>L’accès est limité aux membres validés et au staff. Les réglages permettent de réduire la visibilité du profil, du grade et du palmarès.</p>
        </section>
        <section>
          <h2>Conservation et sécurité</h2>
          <p>Les données sont conservées pendant la durée nécessaire à la vie du compte et protégées par des contrôles d’accès. Les mots de passe sont stockés sous forme de condensats sécurisés et ne sont jamais lisibles par le club.</p>
        </section>
        <section>
          <h2>Vos droits</h2>
          <p>Vous pouvez modifier vos informations, quitter le club ou supprimer définitivement votre compte depuis l’application. Pour exercer un droit d’accès, de rectification, d’effacement ou d’opposition, écrivez à <a href="mailto:contact@roninbjj.fr">contact@roninbjj.fr</a>.</p>
        </section>
      </div>
      <footer>Ronin Fight Team · RFT · <a href="/support">Assistance</a></footer>
    </main>
  </body>
</html>`;
