import React from "react";

const pageContent = {
  privacy: {
    eyebrow: "Privacy",
    title: "プライバシーポリシー",
    sections: [
      {
        heading: "扱う情報",
        body: "Coffee Blend Lab は、認証のためのメールアドレスと、ユーザーが登録した豆、抽出方法、ブレンド、 tasting note などの実験記録を扱います。",
      },
      {
        heading: "保存とアクセス",
        body: "データは Supabase に保存され、認証されたユーザーごとの範囲で扱われます。ほかのユーザーの非公開データへアクセスできない設計を維持します。",
      },
      {
        heading: "問い合わせ",
        body: "問い合わせ窓口を追加した場合、送信された内容は問い合わせ対応とサービス改善のために利用します。認証情報、パスワード、個人情報などの機密情報は送信しないでください。",
      },
    ],
  },
  terms: {
    eyebrow: "Terms",
    title: "利用規約",
    sections: [
      {
        heading: "サービスの目的",
        body: "Coffee Blend Lab は、コーヒーブレンドの作成、記録、比較、改善を支援するための個人向け実験記録ツールです。",
      },
      {
        heading: "記録内容",
        body: "ユーザーが入力した配合、評価、メモなどの正確性と管理はユーザー自身の責任で行ってください。",
      },
      {
        heading: "利用上の注意",
        body: "不正アクセス、他者の利用を妨げる行為、サービスの運用を妨害する行為は禁止します。サービス内容は改善のため変更または停止される場合があります。",
      },
    ],
  },
  contact: {
    eyebrow: "Feedback",
    title: "Contact / Feedback",
    sections: [
      {
        heading: "問い合わせ窓口",
        body: "問い合わせ窓口は準備中です。今後、フィードバックや不具合報告を送信できる窓口を追加する予定です。",
      },
      {
        heading: "送信時の注意",
        body: "認証情報、パスワード、個人情報などの機密情報は送信しないでください。",
      },
    ],
  },
};

export function LegalPage({ page, onBack }) {
  const content = pageContent[page] || pageContent.contact;

  return (
    <div className="legal-page-layout">
      <section className="panel legal-panel" aria-labelledby="legalPageTitle">
        <div className="legal-heading">
          <p className="eyebrow">{content.eyebrow}</p>
          <h2 id="legalPageTitle">{content.title}</h2>
        </div>
        <div className="legal-content">
          {content.sections.map((section) => (
            <section className="legal-section" key={section.heading}>
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </section>
          ))}
          {content.action && (
            <a className="legal-action-link" href={content.action.href} target="_blank" rel="noreferrer">
              {content.action.label}
            </a>
          )}
        </div>
      </section>
      <div className="legal-page-actions">
        <button className="ghost-button" type="button" onClick={onBack}>
          戻る
        </button>
      </div>
    </div>
  );
}

export function isLegalPage(page) {
  return Boolean(pageContent[page]);
}
