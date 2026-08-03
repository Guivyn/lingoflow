import { Stack, Typography, Chip, Box } from "@mui/material";
import { useMemo } from "react";
import { useI18n } from "../../hooks/I18n";
import { useSetting } from "../../hooks/Setting";
import { getAllProviders } from "../../providers";
import { DEFAULT_API_LIST } from "../../config";
import { Button, Input, SettingRow, SettingSection, Switch, tokens } from "../../ui";
import type { ProviderConfig } from "../../core/storage/types";
import type { TranslationProvider } from "../../providers/types";

const CAPABILITY_ITEMS: Array<{
  key: keyof TranslationProvider["capabilities"];
  label: string;
}> = [
  { key: "machine", label: "Machine" },
  { key: "ai", label: "AI" },
  { key: "batch", label: "Batch" },
  { key: "stream", label: "Stream" },
  { key: "context", label: "Context" },
];

type SettingShape = {
  transApis?: ProviderConfig[];
};

/**
 * 接口设置页：基于 Provider Registry 提供开关、名称与基础连接配置。
 */
export default function Providers() {
  const i18n = useI18n() as (key: string, fallback?: string) => string;
  const { setting, updateSetting } = useSetting() as unknown as {
    setting: SettingShape;
    updateSetting: (patchOrFn: unknown) => void;
  };
  const providers = getAllProviders() as unknown as TranslationProvider[];
  const transApis = useMemo(
    () => (Array.isArray(setting?.transApis) ? setting.transApis : []),
    [setting?.transApis]
  );

  const updateProvider = (apiSlug: string, patch: Partial<ProviderConfig>) => {
    updateSetting((prev: Record<string, unknown>) => ({
      ...prev,
      transApis: (Array.isArray(prev?.transApis) ? prev.transApis : []).map(
        (api: ProviderConfig) =>
          api.apiSlug === apiSlug ? { ...api, ...patch } : api
      ),
    }));
  };

  const addProvider = (apiType: string) => {
    const defaultApi = DEFAULT_API_LIST.find((api) => api.apiType === apiType);
    if (!defaultApi) {
      return;
    }

    const apiSlug = `${apiType}_${crypto.randomUUID()}`;
    updateSetting((prev: Record<string, unknown>) => ({
      ...prev,
      transApis: [
        ...(Array.isArray(prev?.transApis) ? prev.transApis : []),
        {
          ...defaultApi,
          apiSlug,
          apiName: `${apiType} ${transApis.length + 1}`,
        },
      ],
    }));
  };

  const instancesByType = useMemo(() => {
    const map = new Map<string, ProviderConfig[]>();
    for (const api of transApis) {
      const list = map.get(api.apiType) || [];
      list.push(api);
      map.set(api.apiType, list);
    }
    return map;
  }, [transApis]);

  return (
    <Stack spacing={`${tokens.spacing.xl}px`}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: `${tokens.spacing.lg}px`,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.font.sizeDisplay,
            fontWeight: tokens.font.weightSemibold,
            letterSpacing: tokens.font.trackingDisplay,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {i18n("apis_setting", "接口设置")}
        </Typography>
        <Button component="a" href="#/apis" variant="outlined">
          {i18n("advanced_api_settings", "高级接口设置")}
        </Button>
      </Box>

      {providers.map((provider) => {
        const instances = instancesByType.get(provider.apiType) || [];
        const capabilities = provider.capabilities || {};
        const capabilityItems = CAPABILITY_ITEMS.filter(
          (item) => capabilities[item.key]
        );

        if (instances.length === 0) {
          return (
            <SettingSection
              key={provider.apiType}
              title={provider.name}
              extra={provider.apiType}
            >
              <SettingRow title={i18n("provider_not_configured", "尚未添加该服务商")}>
                <Button
                  variant="outlined"
                  onClick={() => addProvider(provider.apiType)}
                >
                  {i18n("add", "Add")}
                </Button>
              </SettingRow>
            </SettingSection>
          );
        }

        return (
          <Stack
            key={provider.apiType}
            spacing={`${tokens.spacing.xl}px`}
          >
            {instances.map((instance) => (
              <SettingSection
                key={instance.apiSlug}
                title={instance.apiName || provider.name}
                extra={provider.apiType}
              >
                {capabilityItems.length > 0 ? (
                  <SettingRow title={i18n("capabilities", "Capabilities")}>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ justifyContent: "flex-end" }}
                    >
                      {capabilityItems.map((item) => (
                        <Chip
                          key={item.key}
                          label={item.label}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </SettingRow>
                ) : null}

                <SettingRow title={i18n("enable", "Enable")}>
                  <Switch
                    checked={!instance.isDisabled}
                    onChange={(event) =>
                      updateProvider(instance.apiSlug, {
                        isDisabled: !event.target.checked,
                      })
                    }
                  />
                </SettingRow>
                <SettingRow title={i18n("api_name", "Name")}>
                  <Input
                    fullWidth
                    variant="standard"
                    value={instance.apiName || provider.name}
                    onChange={(event) =>
                      updateProvider(instance.apiSlug, {
                        apiName: event.target.value,
                      })
                    }
                  />
                </SettingRow>
                {!capabilities.machine ? (
                  <>
                    <SettingRow title="URL">
                      <Input
                        fullWidth
                        variant="standard"
                        value={instance.url || ""}
                        onChange={(event) =>
                          updateProvider(instance.apiSlug, {
                            url: event.target.value,
                          })
                        }
                      />
                    </SettingRow>
                    <SettingRow title="Key">
                      <Input
                        fullWidth
                        variant="standard"
                        value={instance.key || ""}
                        onChange={(event) =>
                          updateProvider(instance.apiSlug, {
                            key: event.target.value,
                          })
                        }
                      />
                    </SettingRow>
                  </>
                ) : null}
                {capabilities.ai ? (
                  <SettingRow title="Model">
                    <Input
                      fullWidth
                      variant="standard"
                      value={instance.model || ""}
                      onChange={(event) =>
                        updateProvider(instance.apiSlug, {
                          model: event.target.value,
                        })
                      }
                    />
                  </SettingRow>
                ) : null}
              </SettingSection>
            ))}
            <SettingRow title={i18n("add_instance", "Add another")}>
              <Button
                variant="outlined"
                onClick={() => addProvider(provider.apiType)}
              >
                {i18n("add", "Add")}
              </Button>
            </SettingRow>
          </Stack>
        );
      })}
    </Stack>
  );
}
