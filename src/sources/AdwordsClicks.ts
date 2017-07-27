import { AdwordsKeywords } from './AdwordsKeywords';

export class AdwordsClicks extends AdwordsKeywords {
  protected query = `SELECT AccountDescriptiveName, CampaignName, CampaignId, AdGroupName, AdGroupId, Date,
  Device, CriteriaId, CriteriaParameters, KeywordMatchType, ExternalCustomerId, GclId, ClickType, Clicks,
  Page, Slot, UserListId, AdFormat
  FROM   CLICK_PERFORMANCE_REPORT
  DURING `;
}
