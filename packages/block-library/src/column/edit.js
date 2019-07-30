/**
 * External dependencies
 */
import classnames from 'classnames';
import { forEach, find } from 'lodash';

/**
 * WordPress dependencies
 */
import {
	InnerBlocks,
	BlockControls,
	BlockVerticalAlignmentToolbar,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import { withDispatch, withSelect } from '@wordpress/data';
import { compose } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	toWidthPrecision,
	getColumnWidths,
	getAdjacentBlock,
	getEffectiveColumnWidth,
} from '../columns/utils';

function ColumnEdit( {
	attributes,
	updateAlignment,
	updateWidth,
	hasChildBlocks,
} ) {
	const { verticalAlignment, width } = attributes;

	const classes = classnames( 'block-core-columns', {
		[ `is-vertically-aligned-${ verticalAlignment }` ]: verticalAlignment,
	} );

	return (
		<div className={ classes }>
			<BlockControls>
				<BlockVerticalAlignmentToolbar
					onChange={ updateAlignment }
					value={ verticalAlignment }
				/>
			</BlockControls>
			<InspectorControls>
				<PanelBody title={ __( 'Column Settings' ) }>
					<RangeControl
						label={ __( 'Percentage width' ) }
						value={ width || '' }
						onChange={ updateWidth }
						min={ 0 }
						max={ 100 }
						required
						allowReset
					/>
				</PanelBody>
			</InspectorControls>
			<InnerBlocks
				templateLock={ false }
				renderAppender={ (
					hasChildBlocks ?
						undefined :
						() => <InnerBlocks.ButtonBlockAppender />
				) }
			/>
		</div>
	);
}

export default compose(
	withSelect( ( select, ownProps ) => {
		const { clientId } = ownProps;
		const { getBlockOrder } = select( 'core/block-editor' );

		return {
			hasChildBlocks: getBlockOrder( clientId ).length > 0,
		};
	} ),
	withDispatch( ( dispatch, ownProps, registry ) => {
		return {
			updateAlignment( verticalAlignment ) {
				const { clientId, setAttributes } = ownProps;
				const { updateBlockAttributes } = dispatch( 'core/block-editor' );
				const { getBlockRootClientId } = registry.select( 'core/block-editor' );

				// Update own alignment.
				setAttributes( { verticalAlignment } );

				// Reset Parent Columns Block
				const rootClientId = getBlockRootClientId( clientId );
				updateBlockAttributes( rootClientId, { verticalAlignment: null } );
			},
			updateWidth( width ) {
				const { clientId } = ownProps;
				const { updateBlockAttributes } = dispatch( 'core/block-editor' );
				const { getBlockRootClientId, getBlocks } = registry.select( 'core/block-editor' );

				// Constrain or expand siblings to account for gain or loss of
				// total columns area.
				const columns = getBlocks( getBlockRootClientId( clientId ) );
				const column = find( columns, { clientId } );
				const adjacentColumn = getAdjacentBlock( columns, clientId );
				const adjacentColumnWidth = getEffectiveColumnWidth( adjacentColumn, columns.length );
				const previousWidth = getEffectiveColumnWidth( column, columns.length );
				const difference = width - previousWidth;

				// Compute _all_ next column widths, in case the updated column
				// is in the middle of a set of columns which don't yet have
				// any explicit widths assigned (include updates to those not
				// part of the adjacent blocks).
				const nextColumnWidths = {
					...getColumnWidths( columns, columns.length ),
					[ clientId ]: toWidthPrecision( width ),
					[ adjacentColumn.clientId ]: toWidthPrecision( adjacentColumnWidth - difference ),
				};

				forEach( nextColumnWidths, ( nextColumnWidth, columnClientId ) => {
					updateBlockAttributes( columnClientId, { width: nextColumnWidth } );
				} );
			},
		};
	} )
)( ColumnEdit );
