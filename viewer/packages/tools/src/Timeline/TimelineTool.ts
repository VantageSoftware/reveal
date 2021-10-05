/*!
 * Copyright 2021 Cognite AS
 */

import { Cognite3DModel } from '@reveal/core';
import { Cognite3DViewerToolBase } from '../Cognite3DViewerToolBase';
import { TimelineKeyframe } from './TimelineKeyframe';
import { NodeCollectionBase, NodeAppearance } from '@reveal/core/src';

/**
 * Tool to applying styles to nodes based on date to play them over in Timeline
 */
export class TimelineTool extends Cognite3DViewerToolBase {
  private readonly _model: Cognite3DModel;
  private _timelineframes: TimelineKeyframe[];
  private _intervalId: any = 0;
  private _currentDate: Date;
  private _allDates: Date[];

  constructor(cadModel: Cognite3DModel) {
    super();

    this._model = cadModel;
    this._timelineframes = new Array<TimelineKeyframe>();
    this._allDates = new Array<Date>();
    this._currentDate = new Date();
  }

  /**
   * Create Key frame for the Timeline
   * @param date - date value by Date.now() since January 1, 1970
   * @param nodeCollection - Set of nodes to be rendered for the TimelineFrame
   * @param nodeAppearance - Styling of the nodes
   */
  public createKeyFrame(date: Date, nodeCollection: NodeCollectionBase, nodeAppearance?: NodeAppearance) {
    this._timelineframes.push(new TimelineKeyframe(this._model, date, nodeCollection, nodeAppearance));
    this._allDates.push(date);
  }

  /**
   * Removes the TimelineFrame from the Timeline
   * @param date - Date of the TimelineFrame to be removed from the Timeline
   */
  public removeKeyFrame(date: Date) {
    if (this._timelineframes.length > 0) {
      const index = this._timelineframes.findIndex(obj => obj.getTimelineFrameDate() === date);

      if (index > -1) {
        this._timelineframes = this._timelineframes.splice(index, 1);
      }
    }
  }

  /**
   * Overrides styling of cadModel to match styling at "date"
   * @param date - Date of the TimelineFrame to apply the styling on the CAD Model
   */
  private styleByDate(date: Date) {
    if (this._timelineframes.length > 0) {
      let currentIndex = this._timelineframes.findIndex(obj => obj.getTimelineFrameDate() === date);

      // Date provided not found than get the closest downward date
      // e.g if you have keyframes "1000, 2000, 3000" the result from styleByDate(2500) should be styles from 2000
      if (currentIndex === -1) {
        const timelineframe = this._timelineframes.reduce((prev, curr) =>
          date >= curr.getTimelineFrameDate() ? curr : prev
        );
        currentIndex = this._timelineframes.findIndex(obj => obj === timelineframe);
      }

      const currentTimeframe = this._timelineframes[currentIndex];
      const previousTimeframe = this._timelineframes[currentIndex - 1];

      if (previousTimeframe) {
        previousTimeframe.deactivate();
      }
      currentTimeframe.activate();

      this.setNextDate(currentIndex);
    }
  }

  /**
   * Starts playback of Timeline
   * @param startDate - TimelineFrame date to start the Playback of TimelineFrames
   * @param endDate - TimelineFrame date to stop the Playback of TimelineFrames
   * @param durationInMilliSeconds -Number of milli-seconds after which next TimelineFrame is rendered
   */
  public play(startDate: Date, endDate: Date, durationInMilliSeconds: number) {
    this.stopPlayback();
    this.sortTimelineFramesByDates();
    this._currentDate = startDate;
    this.styleByDate(this._currentDate);

    this._intervalId = setInterval(() => {
      if (this._currentDate !== endDate) {
        this.styleByDate(this._currentDate);
      } else {
        this.stopPlayback();
      }
    }, durationInMilliSeconds);
  }

  /**
   * Stops any ongoing playback
   */
  public stopPlayback() {
    if (this._intervalId !== 0) {
      clearInterval(this._intervalId);
      this._intervalId = 0;
    }
  }

  /**
   * Restores the Style of the model to default style
   */
  public applyDefaultStyle() {
    if (this._timelineframes.length > 0) {
      this._timelineframes[0].applyDefaultStyle();
    }
  }

  /**
   * Provides the next Timelineframes date value
   */
  private setNextDate(index: number) {
    if (index < this._timelineframes.length - 1) {
      this._currentDate = this._timelineframes[index + 1].getTimelineFrameDate();
    }
  }

  private sortTimelineFramesByDates() {
    this._timelineframes.sort((a: TimelineKeyframe, b: TimelineKeyframe) => {
      return a.getTimelineFrameDate().getTime() - b.getTimelineFrameDate().getTime();
    });
  }

  /**
   * Provides all the dates in the TImeline
   * @returns All dates in the Timeline
   */
  public getAllDateInTimelineFrames() {
    if (this._allDates.length > 0) {
      return this._allDates;
    }
  }

  public dispose(): void {
    super.dispose();
  }
}
