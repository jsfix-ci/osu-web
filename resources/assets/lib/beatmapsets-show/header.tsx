// Copyright (c) ppy Pty Ltd <contact@ppy.sh>. Licensed under the GNU Affero General Public License v3.0.
// See the LICENCE file in the repository root for full licence text.

import BeatmapsetCover from 'components/beatmapset-cover';
import BeatmapsetMapping from 'components/beatmapset-mapping';
import BigButton from 'components/big-button';
import StringWithComponent from 'components/string-with-component';
import { UserLink } from 'components/user-link';
import UserListPopup, { createTooltip } from 'components/user-list-popup';
import { route } from 'laroute';
import { action, computed, makeObservable } from 'mobx';
import { observer } from 'mobx-react';
import core from 'osu-core-singleton';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getArtist, getTitle } from 'utils/beatmap-helper';
import { toggleFavourite } from 'utils/beatmapset-helper';
import { classWithModifiers } from 'utils/css';
import { formatNumber } from 'utils/html';
import { beatmapDownloadDirect, wikiUrl } from 'utils/url';
import BeatmapPicker from './beatmap-picker';
import BeatmapsetMenu from './beatmapset-menu';
import Controller from './controller';
import Stats from './stats';

const favouritesToShow = 50;

interface DownloadButtonOptions {
  bottomTextKey?: string;
  href: string;
  icon?: string;
  topTextKey?: string;
}

interface Props {
  controller: Controller;
}

@observer
export default class Header extends React.Component<Props> {
  private get controller() {
    return this.props.controller;
  }

  @computed
  private get favouritePopup() {
    return renderToStaticMarkup(
      <UserListPopup count={this.controller.beatmapset.favourite_count} users={this.filteredFavourites} />,
    );
  }

  @computed
  private get filteredFavourites() {
    let ret = this.controller.beatmapset.recent_favourites;

    const user = core.currentUser;
    if (user != null) {
      ret = ret.filter((f) => f.id !== user.id);

      if (this.controller.beatmapset.has_favourited) {
        ret.unshift(user);
      }
    }

    return ret.slice(0, favouritesToShow);
  }

  private get hasAvailabilityInfo() {
    return this.controller.beatmapset.availability.download_disabled
      || this.controller.beatmapset.availability.more_information != null;
  }

  constructor(props: Props) {
    super(props);

    makeObservable(this);
  }

  render() {
    const favouriteButton = this.controller.beatmapset.has_favourited
      ? {
        action: 'unfavourite',
        icon: 'fas fa-heart',
      } : {
        action: 'favourite',
        icon: 'far fa-heart',
      };

    return (
      <div className='beatmapset-header'>
        <div className='beatmapset-header__content'>
          <div className='beatmapset-header__cover'>
            <BeatmapsetCover
              beatmapset={this.controller.beatmapset}
              forceShowVisual // check already covered by parent component
              modifiers='full'
              size='cover'
            />
          </div>

          <div className='beatmapset-header__box beatmapset-header__box--main'>
            <div className='beatmapset-header__beatmap-picker-box'>
              <BeatmapPicker controller={this.controller} />

              {this.controller.hoveredBeatmap == null ? (
                <span className='beatmapset-header__diff-name'>
                  {this.controller.currentBeatmap.version}

                  {this.controller.currentBeatmap.user_id !== this.controller.beatmapset.user_id && (
                    <span className='beatmapset-header__diff-extra'>
                      <StringWithComponent
                        mappings={{
                          mapper: <UserLink user={this.controller.mapper(this.controller.currentBeatmap)} />,
                        }}
                        pattern={osu.trans('beatmapsets.show.details.mapped_by')}
                      />
                    </span>
                  )}
                </span>
              ) : (
                <span className='beatmapset-header__diff-name'>
                  {this.controller.hoveredBeatmap.version}

                  <span className='beatmapset-header__diff-extra beatmapset-header__diff-extra--star-difficulty'>
                    {osu.trans('beatmapsets.show.stats.stars')}
                    {' '}
                    {formatNumber(this.controller.hoveredBeatmap.difficulty_rating, 2)}
                  </span>
                </span>
              )}

              <div>
                <span className='beatmapset-header__value' title={osu.trans('beatmapsets.show.stats.playcount')}>
                  <span className='beatmapset-header__value-icon'><span className='fas fa-play-circle' /></span>
                  <span className='beatmapset-header__value-name'>{formatNumber(this.controller.beatmapset.play_count)}</span>
                </span>

                {this.controller.beatmapset.status === 'pending' &&
                  <span className='beatmapset-header__value' title={osu.trans('beatmapsets.show.stats.nominations')}>
                    <span className='beatmapset-header__value-icon'><span className='fas fa-thumbs-up' /></span>
                    <span className='beatmapset-header__value-name'>
                      {formatNumber(this.controller.beatmapset.nominations_summary.current)}
                    </span>
                  </span>
                }

                <span
                  className={classWithModifiers('beatmapset-header__value', { 'has-favourites': this.controller.beatmapset.favourite_count > 0 })}
                  onMouseOver={this.onEnterFavouriteIcon}
                  onTouchStart={this.onEnterFavouriteIcon}
                >
                  <span className='beatmapset-header__value-icon'>
                    <span className='fas fa-heart' />
                  </span>
                  <span className='beatmapset-header__value-name'>
                    {formatNumber(this.controller.beatmapset.favourite_count)}
                  </span>
                </span>
              </div>
            </div>

            <span className='beatmapset-header__details-text beatmapset-header__details-text--title'>
              <a
                className='beatmapset-header__details-text-link'
                href={route('beatmapsets.index', { q: getTitle(this.controller.beatmapset) })}
              >
                {getTitle(this.controller.beatmapset)}
              </a>
              {this.controller.beatmapset.nsfw &&
                <span className='beatmapset-badge beatmapset-badge--nsfw'>{osu.trans('beatmapsets.nsfw_badge.label')}</span>
              }
              {this.controller.beatmapset.spotlight &&
                <a
                  className='beatmapset-badge beatmapset-badge--spotlight'
                  href={wikiUrl('Beatmap_Spotlights')}
                >
                  {osu.trans('beatmapsets.spotlight_badge.label')}
                </a>
              }
            </span>

            <span className='beatmapset-header__details-text beatmapset-header__details-text--artist'>
              <a
                className='beatmapset-header__details-text-link'
                href={route('beatmapsets.index', { q: getArtist(this.controller.beatmapset) })}
              >
                {getArtist(this.controller.beatmapset)}
              </a>
              {this.controller.beatmapset.track_id != null &&
                <a
                  className='beatmapset-badge beatmapset-badge--featured-artist'
                  href={route('tracks.show', { track: this.controller.beatmapset.track_id })}
                >
                  {osu.trans('beatmapsets.featured_artist_badge.label')}
                </a>
              }
            </span>

            <BeatmapsetMapping beatmapset={this.controller.beatmapset} />

            {this.renderAvailabilityInfo()}

            <div className='beatmapset-header__buttons'>
              {core.currentUser != null &&
                <BigButton
                  icon={favouriteButton.icon}
                  modifiers={['beatmapset-header-square', `beatmapset-header-square-${favouriteButton.action}`]}
                  props={{
                    onClick: this.onClickFavourite,
                    title: osu.trans(`beatmapsets.show.details.${favouriteButton.action}`),
                  }}
                />
              }

              {this.renderDownloadButtons()}
              {this.renderLoginButton()}

              {!this.controller.beatmapset.is_scoreable && core.currentUser != null && core.currentUser.id !== this.controller.beatmapset.user_id &&
                <div className='beatmapset-header__more'>
                  <div className='btn-circle btn-circle--page-toggle btn-circle--page-toggle-detail'>
                    <BeatmapsetMenu beatmapset={this.controller.beatmapset} />
                  </div>
                </div>
              }
            </div>
          </div>

          <div className='beatmapset-header__box beatmapset-header__box--stats'>
            {this.renderStatusBar()}

            <Stats controller={this.controller} />
          </div>
        </div>
      </div>
    );
  }

  private downloadButton({ bottomTextKey, href, icon = 'fas fa-download', topTextKey = '_' }: DownloadButtonOptions) {
    return (
      <BigButton
        href={href}
        icon={icon}
        modifiers='beatmapset-header'
        props={{
          'data-turbolinks': 'false',
        }}
        text={{
          bottom: bottomTextKey == null ? undefined : osu.trans(`beatmapsets.show.details.download.${bottomTextKey}`),
          top: osu.trans(`beatmapsets.show.details.download.${topTextKey}`),
        }}
      />
    );
  }

  private readonly onClickFavourite = () => {
    toggleFavourite(this.controller.beatmapset);
  };

  @action
  private readonly onEnterFavouriteIcon = (event: React.MouseEvent<HTMLSpanElement> | React.TouchEvent<HTMLSpanElement>) => {
    const target = event.currentTarget;

    if (this.filteredFavourites.length < 1) {
      if (target._tooltip === '1') {
        target._tooltip = '';
        $(target).qtip('destroy', true);
      }

      return;
    }

    createTooltip(target, 'right center', action(() => this.favouritePopup));
  };

  private renderAvailabilityInfo() {
    if (core.currentUser == null || !this.hasAvailabilityInfo) return;

    let label: string;
    let href: string | null;

    if (this.controller.beatmapset.availability.download_disabled) {
      label = osu.trans('beatmapsets.availability.disabled');
    } else {
      if (this.controller.beatmapset.availability.more_information === 'rule_violation') {
        label = osu.trans('beatmapsets.availability.rule_violation');
        href = `${wikiUrl('Rules')}#beatmap-submission-rules`;
      } else {
        label = osu.trans('beatmapsets.availability.parts-removed');
      }
    }

    href ??= this.controller.beatmapset.availability.more_information;

    return (
      <div className='beatmapset-header__availability-info'>
        {label}

        {href != null &&
          <div className='beatmapset-header__availability-link'>
            <a href={href} rel="noreferrer" target='_blank'>
              {osu.trans('beatmapsets.availability.more-info')}
            </a>
          </div>
        }
      </div>
    );
  }

  private renderDownloadButtons() {
    if (core.currentUser == null || (this.controller.beatmapset.availability?.download_disabled ?? false)) return;

    return (
      <>
        {this.controller.beatmapset.video ? (
          <>
            {this.downloadButton({
              bottomTextKey: 'video',
              href: route('beatmapsets.download', { beatmapset: this.controller.beatmapset.id }),
            })}

            {this.downloadButton({
              bottomTextKey: 'no-video',
              href: route('beatmapsets.download', { beatmapset: this.controller.beatmapset.id, noVideo: 1 }),
            })}
          </>
        ) : (this.downloadButton({
          href: route('beatmapsets.download', { beatmapset: this.controller.beatmapset.id }),
        }))}

        {this.downloadButton({
          href: core.currentUser.is_supporter
            ? beatmapDownloadDirect(this.controller.currentBeatmap.id)
            : route('support-the-game'),
          topTextKey: 'direct',
        })}
      </>
    );
  }

  private renderLoginButton() {
    if (core.currentUser != null) return;

    return (
      <BigButton
        extraClasses={['js-user-link']}
        icon='fas fa-lock'
        modifiers='beatmapset-header'
        text={{
          bottom: osu.trans('beatmapsets.show.details.login_required.bottom'),
          top: osu.trans('beatmapsets.show.details.login_required.top'),
        }}
      />
    );
  }

  private renderStatusBar() {
    return (
      <div className='beatmapset-header__status'>
        {this.controller.beatmapset.storyboard &&
          <div
            className='beatmapset-status beatmapset-status--show-icon'
            title={osu.trans('beatmapsets.show.info.storyboard')}
          >
            <span className='fas fa-image' />
          </div>
        }
        <div className='beatmapset-status beatmapset-status--show'>
          {osu.trans(`beatmapsets.show.status.${this.controller.currentBeatmap.status}`)}
        </div>
      </div>
    );
  }
}
