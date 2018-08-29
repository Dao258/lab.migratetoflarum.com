import m from 'mithril';
import moment from 'moment';
import icon from '../helpers/icon';
import link from '../helpers/link';
import Rating from './Rating';
import FlarumVersionString from './FlarumVersionString';
import getObjectKey from '../helpers/getObjectKey';

export default {
    view(vnode) {
        const scans = vnode.attrs.scans;

        return m('.list-group.list-group-flush', scans.map(
            scan => link('/scans/' + scan.id, {
                className: 'list-group-item list-group-item-action',
            }, m('.row', [
                m('.col-1', m(Rating, {
                    rating: scan.attributes.rating,
                })),
                m('.col-8', [
                    m('div', [
                        scan.relationships.website.data.attributes.name,
                        ' - ',
                        m('span.text-muted', scan.relationships.website.data.attributes.normalized_url.replace(/\/$/, '')),
                        (scan.attributes.hidden ? m('span.text-muted', {
                            title: 'This scan won\'t show up for other users',
                        }, [' ', icon('eye-slash')]) : null),
                    ]),
                    m('.text-muted', [
                        m(FlarumVersionString, {
                            version: getObjectKey(scan, 'attributes.report.homepage.version'),
                        }),
                        ' - ',
                        (scan.relationships.extensions ? scan.relationships.extensions.data.length : '?') + ' extensions',
                    ]),
                ]),
                m('.col-3.text-muted.text-right', moment(scan.attributes.scanned_at).fromNow()),
            ]))
        ));
    },
}
