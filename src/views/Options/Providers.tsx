import { Stack, Typography, Chip, Box } from "@mui/material";
import { useI18n } from "../../hooks/I18n";
import { useSetting } from "../../hooks/Setting";
import { getAllProviders } from "../../providers";
import { DEFAULT_API_LIST } from "../../config";
import { Button, Card, Input, SettingItem, Switch } from "../../ui";
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
 * Provider 设置页：基于现有 Provider Registry 提供开关、名称与基础连接配置。
 * 高级接口设置仍保留在 /apis。
 */
export default function Providers() {
  const i18n = useI18n() as (key: string, fallback?: string) => string;
  const { setting, updateSetting } = useSetting() as unknown as {
    setting: SettingShape;
    updateSetting: (patchOrFn: unknown) => void;
  };
  const providers = getAllProviders() as unknown as TranslationProvider[];
  const transApis = Array.isArray(setting?.transApis)
    ? setting.transApis
    : [];

  const updateProvider = (apiType: string, patch: Partial<ProviderConfig>) => {
    updateSetting((prev: Record<string, unknown>) => ({
      ...prev,
      transApis: (Array.isArray(prev?.transApis) ? prev.transApis : []).map(
        (api: ProviderConfig) =>
          api.apiType === apiType ? { ...api, ...patch } : api
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

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Typography variant="h6">
          {i18n("providers_setting", "Providers")}
        </Typography>
        <Button
          component="a"
          href="#/apis"
          variant="outlined"
          sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
        >
          {i18n("advanced_api_settings", "Advanced API settings")}
        </Button>
      </Stack>

      {providers.map((provider) => {
        const providerConfig = transApis.find(
          (api) => api.apiType === provider.apiType
        );
        const capabilities = provider.capabilities || {};
        const capabilityItems = CAPABILITY_ITEMS.filter(
          (item) => capabilities[item.key]
        );

        return (
          <Card key={provider.apiType} sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={1}
                justifyContent="space-between"
                alignItems="center"
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2">{provider.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {provider.apiType}
                  </Typography>
                </Box>
                <Switch
                  checked={!providerConfig?.isDisabled}
                  disabled={!providerConfig}
                  onChange={(event) =>
                    updateProvider(provider.apiType, {
                      isDisabled: !event.target.checked,
                    })
                  }
                />
              </Stack>

              {capabilityItems.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {capabilityItems.map((item) => (
                    <Chip
                      key={item.key}
                      label={item.label}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              ) : null}

              {providerConfig ? (
                <>
                  <SettingItem title={i18n("api_name", "Name")}>
                    <Input
                      fullWidth
                      value={providerConfig.apiName || provider.name}
                      onChange={(event) =>
                        updateProvider(provider.apiType, {
                          apiName: event.target.value,
                        })
                      }
                    />
                  </SettingItem>
                  {!capabilities.machine ? (
                    <>
                      <SettingItem title="URL">
                        <Input
                          fullWidth
                          value={providerConfig.url || ""}
                          onChange={(event) =>
                            updateProvider(provider.apiType, {
                              url: event.target.value,
                            })
                          }
                        />
                      </SettingItem>
                      <SettingItem title="Key">
                        <Input
                          fullWidth
                          value={providerConfig.key || ""}
                          onChange={(event) =>
                            updateProvider(provider.apiType, {
                              key: event.target.value,
                            })
                          }
                        />
                      </SettingItem>
                    </>
                  ) : null}
                  {capabilities.ai ? (
                    <SettingItem title="Model">
                      <Input
                        fullWidth
                        value={providerConfig.model || ""}
                        onChange={(event) =>
                          updateProvider(provider.apiType, {
                            model: event.target.value,
                          })
                        }
                      />
                    </SettingItem>
                  ) : null}
                </>
              ) : (
                <Box>
                  <Button
                    variant="outlined"
                    onClick={() => addProvider(provider.apiType)}
                  >
                    {i18n("add", "Add")}
                  </Button>
                </Box>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
