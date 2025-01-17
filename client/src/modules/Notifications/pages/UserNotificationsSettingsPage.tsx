import { useState, useMemo, ChangeEvent, useCallback } from 'react';
import { Button, message, Space } from 'antd';
import {
  NotificationsService,
  NotificationChannel,
  UserNotificationSettings,
} from 'modules/Notifications/services/notifications';
import { set } from 'lodash';
import { useLoading } from 'components/useLoading';
import { useAsync } from 'react-use';
import { Session } from 'components/withSession';
import { PageLayout } from 'components/PageLayout';
import { NotificationsTable } from '../components/NotificationsUserSettingsTable';
import { Consents } from '../components/Consents';
import { UpdateNotificationUserSettingsDto } from 'api';

type Props = { session: Session };

export function UserNotificationsPage(props: Props) {
  const [notifications, setNotifications] = useState<UserNotificationSettings[]>([]);
  const [loading, withLoading] = useLoading(false);
  const service = useMemo(() => new NotificationsService(), []);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasTelegram, setHasTelegram] = useState(false);
  const [disabledChannels, setDisabledChannels] = useState<NotificationChannel[]>([]);

  const loadData = useCallback(
    withLoading(async () => {
      const { contacts, notifications } = await service.getUserNotificationSettings();
      setNotifications(notifications);
      const { email, telegram } = contacts as Record<NotificationChannel, string>;
      const hasEmail = !!email;
      const hasTelegram = !!telegram;
      setHasEmail(hasEmail);
      setHasTelegram(hasTelegram);

      const disabledChannels = [];
      if (!hasEmail) {
        disabledChannels.push(NotificationChannel.email);
      }
      if (!hasTelegram) {
        disabledChannels.push(NotificationChannel.telegram);
      }
      setDisabledChannels(disabledChannels);
    }),
    [],
  );

  useAsync(loadData, []);

  const onCheck = useCallback(
    async (dataIndex: string[], record: UserNotificationSettings, event: ChangeEvent<HTMLInputElement>) => {
      const newData = [...notifications];
      const index = notifications.findIndex(item => record.id === item.id);
      newData[index] = { ...newData[index] };
      const notification = newData[index];

      set(notification, dataIndex, event.target.checked);

      setNotifications(newData);
    },
    [notifications],
  );

  const hasConnections = Object.keys(NotificationChannel).length !== disabledChannels.length;

  return (
    <PageLayout loading={loading} title="Notifications" githubId={props.session.githubId}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {!loading && <Consents hasEmail={hasEmail} hasTelegram={hasTelegram} />}
        <Space direction="horizontal" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button disabled={!hasConnections} type="primary" onClick={saveSettings}>
            Save
          </Button>
        </Space>
      </Space>
      <NotificationsTable disabledChannels={disabledChannels} notifications={notifications} onCheck={onCheck} />
    </PageLayout>
  );

  async function saveSettings() {
    try {
      await service.saveUserNotifications(
        notifications.reduce((raw: UpdateNotificationUserSettingsDto[], notification) => {
          Object.keys(notification.settings).forEach(channelId => {
            raw.push({
              channelId,
              enabled: (notification.settings as Record<string, boolean>)[channelId],
              notificationId: notification.id,
            });
          });
          return raw;
        }, []),
      );
      message.success('New notification settings saved.');
    } catch {
      message.error('Failed to save settings.');
    }
  }
}
