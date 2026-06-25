import React from 'react';
import { Layout } from '../../components/layout';
import ZohoWorkDriveIngestion from '../../components/Settings/ZohoWorkDriveIngestion';
import { DEFAULT_USER_ID } from '@/lib/default-user';

export default function ZohoWorkDrivePage() {
    const userId = DEFAULT_USER_ID;

    return (
        <Layout>
            <div className="container mx-auto py-8">
                <ZohoWorkDriveIngestion userId={userId} />
            </div>
        </Layout>
    );
}
