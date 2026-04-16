import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConditionContext, ConditionStrategy } from './condition.strategy';

describe('ConditionContext', () => {
  let context: ConditionContext;

  beforeEach(() => {
    context = new ConditionContext();
  });

  describe('基本比较策略', () => {
    it('大于策略：{{score}} > 10', () => {
      const input = { score: 15 };
      const result = context.evaluate(input, '{{score}} > 10');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('greaterThan');
    });

    it('大于策略：{{score}} > 10（不满足）', () => {
      const input = { score: 5 };
      const result = context.evaluate(input, '{{score}} > 10');
      expect(result.result).toBe(false);
    });

    it('小于策略：{{age}} < 18', () => {
      const input = { age: 16 };
      const result = context.evaluate(input, '{{age}} < 18');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('lessThan');
    });

    it('等于策略：{{name}} == "John"', () => {
      const input = { name: 'John' };
      const result = context.evaluate(input, '{{name}} == "John"');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('equal');
    });

    it('等于策略（数字）：{{count}} == 100', () => {
      const input = { count: 100 };
      const result = context.evaluate(input, '{{count}} == 100');
      expect(result.result).toBe(true);
    });

    it('不等于策略：{{status}} != "error"', () => {
      const input = { status: 'success' };
      const result = context.evaluate(input, '{{status}} != "error"');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('notEqual');
    });

    it('大于等于策略：{{score}} >= 60', () => {
      const input = { score: 60 };
      const result = context.evaluate(input, '{{score}} >= 60');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('greaterThanOrEqual');
    });

    it('小于等于策略：{{score}} <= 100', () => {
      const input = { score: 100 };
      const result = context.evaluate(input, '{{score}} <= 100');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('lessThanOrEqual');
    });
  });

  describe('字符串匹配策略', () => {
    it('包含策略：{{content}} contains "keyword"', () => {
      const input = { content: 'This is a keyword in text' };
      const result = context.evaluate(input, '{{content}} contains "keyword"');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('contains');
    });

    it('包含策略（大小写不敏感）：{{content}} contains "KEYWORD"', () => {
      const input = { content: 'This is a keyword in text' };
      const result = context.evaluate(input, '{{content}} contains "KEYWORD"');
      expect(result.result).toBe(true);
    });

    it('开头匹配策略：{{name}} startsWith "Mr"', () => {
      const input = { name: 'Mr. Smith' };
      const result = context.evaluate(input, '{{name}} startsWith "Mr"');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('startsWith');
    });

    it('结尾匹配策略：{{email}} endsWith "@example.com"', () => {
      const input = { email: 'user@example.com' };
      const result = context.evaluate(
        input,
        '{{email}} endsWith "@example.com"',
      );
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('endsWith');
    });
  });

  describe('存在性检查策略', () => {
    it('存在性策略：{{name}} exists（存在）', () => {
      const input = { name: 'John' };
      const result = context.evaluate(input, '{{name}} exists');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('exists');
    });

    it('存在性策略：{{name}} exists（不存在）', () => {
      const input = {};
      const result = context.evaluate(input, '{{name}} exists');
      expect(result.result).toBe(false);
    });

    it('存在性策略：{{name}} exists（空字符串）', () => {
      const input = { name: '' };
      const result = context.evaluate(input, '{{name}} exists');
      expect(result.result).toBe(false);
    });

    it('存在性策略：{{name}} exists（null）', () => {
      const input = { name: null };
      const result = context.evaluate(input, '{{name}} exists');
      expect(result.result).toBe(false);
    });
  });

  describe('特殊输入处理', () => {
    it('支持 START_INPUT 变量', () => {
      const input = { input: 50 };
      const result = context.evaluate(input, '{{START_INPUT}} > 10');
      expect(result.result).toBe(true);
    });

    it('支持反向比较：10 < {{score}}', () => {
      const input = { score: 20 };
      const result = context.evaluate(input, '10 < {{score}}');
      expect(result.result).toBe(true);
    });

    it('空表达式默认返回 true', () => {
      const input = {};
      const result = context.evaluate(input, '');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('empty');
    });
  });

  describe('复杂场景', () => {
    it('嵌套对象属性访问（点号被视为普通字符）', () => {
      const input = { user: { age: 25 } };
      // 当前实现将 "user.age" 视为普通变量名
      // 所以无法访问嵌套属性，这是当前限制
      const result = context.evaluate(input, '{{user.age}} > 18');
      // 由于无法找到 user.age，extractValue 返回 undefined，转为 0
      // 0 > 18 = false
      expect(result.result).toBe(false);
    });

    it('浮点数比较', () => {
      const input = { price: 19.99 };
      const result = context.evaluate(input, '{{price}} < 20');
      expect(result.result).toBe(true);
    });

    it('负数比较', () => {
      const input = { temperature: -5 };
      const result = context.evaluate(input, '{{temperature}} < 0');
      expect(result.result).toBe(true);
    });
  });

  describe('策略注册', () => {
    it('应该返回所有已注册的策略', () => {
      const strategies = context.getRegisteredStrategies();
      expect(strategies).toContain('greaterThan');
      expect(strategies).toContain('lessThan');
      expect(strategies).toContain('equal');
      expect(strategies).toContain('contains');
      expect(strategies).toContain('exists');
    });

    it('应该支持自定义策略', () => {
      // 创建自定义策略
      const customStrategy: ConditionStrategy = {
        name: 'custom',
        matches: (expr: string) => expr === 'always_true',
        evaluate: () => true,
      };

      context.registerStrategy(customStrategy);

      const result = context.evaluate({}, 'always_true');
      expect(result.result).toBe(true);
      expect(result.strategy).toBe('custom');
    });
  });
});
