<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, h, ref } from 'vue';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Register' });

const authStore = useAuthStore();
const loading = ref(false);

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z
        .string()
        .min(3, { message: $t('authentication.usernameTip') })
        .max(30, { message: '用户名长度不能超过30个字符' })
        .regex(/^\w+$/, {
          message: '用户名只能包含字母、数字和下划线',
        }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      renderComponentContent() {
        return {
          strengthText: () => $t('authentication.passwordStrength'),
        };
      },
      rules: z
        .string()
        .min(6, { message: $t('authentication.passwordTip') })
        .max(50, { message: '密码长度不能超过50个字符' }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入邮箱地址（可选）',
        type: 'email',
      },
      fieldName: 'email',
      label: '邮箱',
      rules: z
        .string()
        .email({ message: '请输入有效的邮箱地址' })
        .optional()
        .or(z.literal('')),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.confirmPassword'),
      },
      dependencies: {
        rules(values) {
          const { password } = values;
          return z
            .string({ required_error: $t('authentication.passwordTip') })
            .min(1, { message: $t('authentication.passwordTip') })
            .refine((value) => value === password, {
              message: $t('authentication.confirmPasswordTip'),
            });
        },
        triggerFields: ['password'],
      },
      fieldName: 'confirmPassword',
      label: $t('authentication.confirmPassword'),
    },
    {
      component: 'VbenCheckbox',
      fieldName: 'agreePolicy',
      renderComponentContent: () => ({
        default: () =>
          h('span', [
            $t('authentication.agree'),
            h(
              'a',
              {
                class: 'vben-link ml-1 ',
                href: '',
              },
              `${$t('authentication.privacyPolicy')} & ${$t('authentication.terms')}`,
            ),
          ]),
      }),
      rules: z.boolean().refine((value) => !!value, {
        message: $t('authentication.agreeTip'),
      }),
    },
  ];
});

async function handleSubmit(values: Recordable<any>) {
  try {
    loading.value = true;

    // 验证确认密码
    if (values.password !== values.confirmPassword) {
      throw new Error('两次输入的密码不一致');
    }

    // 验证用户协议
    if (!values.agreePolicy) {
      throw new Error('请同意用户协议和隐私政策');
    }

    // 准备注册数据
    const registerData = {
      username: values.username,
      password: values.password,
      email: values.email || undefined,
    };

    // 调用注册API
    await authStore.authRegister(registerData);
  } catch (error: any) {
    console.error('注册失败:', error);
    // 错误将由 auth store 中的通知系统处理
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthenticationRegister
    :form-schema="formSchema"
    :loading="loading"
    @submit="handleSubmit"
  />
</template>
