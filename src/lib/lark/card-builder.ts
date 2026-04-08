/**
 * Lark Card Builder
 * 便捷的卡片消息构建器
 */

import type {
  LarkCard,
  LarkCardConfig,
  LarkHeaderTemplate,
  LarkElement,
  LarkText,
  LarkDivElement,
  LarkMarkdownElement,
  LarkImageElement,
  LarkNoteElement,
  LarkActionElement,
  LarkActionButton,
} from './types';

export class CardBuilder {
  private card: LarkCard = {
    elements: [],
  };

  /**
   * 设置卡片配置
   */
  config(config: Partial<LarkCardConfig>): this {
    this.card.config = {
      wide_screen_mode: config.wide_screen_mode ?? true,
      enable_forward: config.enable_forward ?? true,
    };
    return this;
  }

  /**
   * 设置卡片标题
   */
  header(title: string, template?: LarkHeaderTemplate): this {
    this.card.header = {
      title: text(title),
      template,
    };
    return this;
  }

  /**
   * 添加 Markdown 内容
   */
  markdown(content: string): this {
    this.card.elements.push({
      tag: 'markdown',
      content,
    } as LarkMarkdownElement);
    return this;
  }

  /**
   * 添加文本块
   */
  text(content: string): this {
    this.card.elements.push({
      tag: 'div',
      text: text(content),
    } as LarkDivElement);
    return this;
  }

  /**
   * 添加字段列表（两列布局）
   */
  fields(fields: { label: string; value: string; short?: boolean }[]): this {
    this.card.elements.push({
      tag: 'div',
      fields: fields.map((f) => ({
        is_short: f.short ?? true,
        text: mdText(`**${f.label}**\n${f.value}`),
      })),
    } as LarkDivElement);
    return this;
  }

  /**
   * 添加图片
   */
  image(imageKey: string, alt?: string, title?: string): this {
    const element: LarkImageElement = {
      tag: 'img',
      img_key: imageKey,
      alt: text(alt ?? 'image'),
    };
    if (title) {
      element.title = text(title);
    }
    this.card.elements.push(element);
    return this;
  }

  /**
   * 添加分割线
   */
  hr(): this {
    this.card.elements.push({ tag: 'hr' });
    return this;
  }

  /**
   * 添加备注
   */
  note(content: string): this {
    this.card.elements.push({
      tag: 'note',
      elements: [text(content)],
    } as LarkNoteElement);
    return this;
  }

  /**
   * 添加按钮
   */
  button(
    label: string,
    options?: {
      url?: string;
      type?: 'default' | 'primary' | 'danger';
      value?: Record<string, unknown>;
    }
  ): this {
    const button: LarkActionButton = {
      tag: 'button',
      text: text(label),
      type: options?.type ?? 'default',
    };
    if (options?.url) {
      button.url = options.url;
    }
    if (options?.value) {
      button.value = options.value;
    }

    // 找到或创建 action 元素
    let actionElement = this.card.elements.find(
      (e): e is LarkActionElement => e.tag === 'action'
    );
    if (!actionElement) {
      actionElement = { tag: 'action', actions: [] };
      this.card.elements.push(actionElement);
    }
    actionElement.actions.push(button);
    return this;
  }

  /**
   * 添加自定义元素
   */
  element(element: LarkElement): this {
    this.card.elements.push(element);
    return this;
  }

  /**
   * 构建卡片
   */
  build(): LarkCard {
    return this.card;
  }
}

/**
 * 创建纯文本
 */
export function text(content: string): LarkText {
  return {
    tag: 'plain_text',
    content,
  };
}

/**
 * 创建 Markdown 文本
 */
export function mdText(content: string): LarkText {
  return {
    tag: 'lark_md',
    content,
  };
}

/**
 * 创建卡片构建器
 */
export function createCard(): CardBuilder {
  return new CardBuilder();
}

