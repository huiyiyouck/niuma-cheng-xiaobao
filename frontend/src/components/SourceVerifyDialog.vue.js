/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from "vue";
import { preVerifySource } from "@/lib/api";
const props = defineProps();
const emit = defineEmits();
const loading = ref(false);
const errorText = ref(null);
const result = ref(null);
async function doVerify() {
    loading.value = true;
    errorText.value = null;
    result.value = null;
    try {
        result.value = await preVerifySource({
            type: props.sourceType,
            source_identity: props.sourceIdentity,
        });
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
function confirmVerified() {
    if (result.value) {
        emit("verified", result.value);
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['verify-info']} */ ;
/** @type {__VLS_StyleScopedClasses['verify-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['verify-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['verify-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Teleport | typeof __VLS_components.Teleport} */
Teleport;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: "body",
}));
const __VLS_2 = __VLS_1({
    to: "body",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('close');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "verify-overlay" },
});
/** @type {__VLS_StyleScopedClasses['verify-overlay']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "verify-box" },
});
/** @type {__VLS_StyleScopedClasses['verify-box']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "verify-title" },
});
/** @type {__VLS_StyleScopedClasses['verify-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "verify-info" },
});
/** @type {__VLS_StyleScopedClasses['verify-info']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "muted" },
});
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
(__VLS_ctx.sourceType === 'x_twitter' ? 'X/Twitter' : 'RSS');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "muted" },
});
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
(__VLS_ctx.sourceIdentity);
if (__VLS_ctx.errorText) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "verify-error" },
    });
    /** @type {__VLS_StyleScopedClasses['verify-error']} */ ;
    (__VLS_ctx.errorText);
}
if (__VLS_ctx.result) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "verify-result" },
        ...{ class: (__VLS_ctx.result.status === 'ok' ? 'result-ok' : 'result-err') },
    });
    /** @type {__VLS_StyleScopedClasses['verify-result']} */ ;
    if (__VLS_ctx.sourceType === 'x_twitter' && __VLS_ctx.result.account_name) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "result-account" },
        });
        /** @type {__VLS_StyleScopedClasses['result-account']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "account-header" },
        });
        /** @type {__VLS_StyleScopedClasses['account-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "account-name" },
        });
        /** @type {__VLS_StyleScopedClasses['account-name']} */ ;
        (__VLS_ctx.result.account_name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "account-username" },
        });
        /** @type {__VLS_StyleScopedClasses['account-username']} */ ;
        (__VLS_ctx.result.account_username);
        if (__VLS_ctx.result.account_bio) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "account-bio" },
            });
            /** @type {__VLS_StyleScopedClasses['account-bio']} */ ;
            (__VLS_ctx.result.account_bio);
        }
    }
    if (__VLS_ctx.sourceType === 'rss' && __VLS_ctx.result.site_title) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "result-site" },
        });
        /** @type {__VLS_StyleScopedClasses['result-site']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "site-title" },
        });
        /** @type {__VLS_StyleScopedClasses['site-title']} */ ;
        (__VLS_ctx.result.site_title);
        if (__VLS_ctx.result.site_description) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "site-desc" },
            });
            /** @type {__VLS_StyleScopedClasses['site-desc']} */ ;
            (__VLS_ctx.result.site_description);
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "result-stats" },
    });
    /** @type {__VLS_StyleScopedClasses['result-stats']} */ ;
    if (__VLS_ctx.result.status === 'ok') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "stat-ok" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-ok']} */ ;
        (__VLS_ctx.result.total_fetched);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "stat-err" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-err']} */ ;
        (__VLS_ctx.result.error);
    }
    if (__VLS_ctx.result.items.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "result-preview" },
        });
        /** @type {__VLS_StyleScopedClasses['result-preview']} */ ;
        for (const [it] of __VLS_vFor((__VLS_ctx.result.items.slice(0, 5)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (it.source_item_id),
                ...{ class: "preview-item" },
            });
            /** @type {__VLS_StyleScopedClasses['preview-item']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "preview-title" },
            });
            /** @type {__VLS_StyleScopedClasses['preview-title']} */ ;
            (it.title || "(无标题)");
            if (it.published_at) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "preview-time" },
                });
                /** @type {__VLS_StyleScopedClasses['preview-time']} */ ;
                (new Date(it.published_at).toLocaleString());
            }
            // @ts-ignore
            [sourceType, sourceType, sourceType, sourceIdentity, errorText, errorText, result, result, result, result, result, result, result, result, result, result, result, result, result, result, result, result,];
        }
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "verify-actions" },
});
/** @type {__VLS_StyleScopedClasses['verify-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('close');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "btn" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
if (!__VLS_ctx.result) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.doVerify) },
        ...{ class: "btn primary" },
        disabled: (__VLS_ctx.loading),
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    (__VLS_ctx.loading ? "验证中…" : "开始验证");
}
if (__VLS_ctx.result && __VLS_ctx.result.status === 'ok') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.confirmVerified) },
        ...{ class: "btn primary" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
}
// @ts-ignore
[result, result, result, doVerify, loading, loading, confirmVerified,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
